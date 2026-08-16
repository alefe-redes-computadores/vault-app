"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Search, Plus, ChevronRight, Calendar, 
  DollarSign, FileWarning, Pill 
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

export default function RenovacoesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const [search, setSearch] = useState("");

  // ✅ CORRIGIDO: db.renovacoes em vez de db.table("renovacoes")
  const renovacoes = useLiveQuery(() => db.renovacoes.toArray(), []) || [];
  const medicamentos = useLiveQuery(() => db.medicamentos.toArray(), []) || [];

  const medicamentoMap = useMemo(() => new Map(medicamentos.map((m: any) => [m.id, m])), [medicamentos]);

  const renovacoesEnriquecidas = useMemo(() => {
    return renovacoes.map((r: any) => {
      const med = medicamentoMap.get(r.medicamento_id);
      return {
        ...r,
        medicamentoNome: med?.nome || "Medicamento não encontrado",
        medicamentoDosagem: med?.dosagem || "",
      };
    });
  }, [renovacoes, medicamentoMap]);

  const filteredRenovacoes = renovacoesEnriquecidas.filter((r: any) =>
    r.medicamentoNome.toLowerCase().includes(search.toLowerCase()) ||
    (r.observacoes && r.observacoes.toLowerCase().includes(search.toLowerCase()))
  );

  if (!renovacoes) return <LoadingSkeleton />;

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice">Vault Saúde</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">Histórico de Renovações</h1>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por medicamento ou notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredRenovacoes.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ice/10 text-ice">
                <FileWarning size={24} />
              </div>
              <p className="text-sm font-medium text-ink-primary">Nenhuma renovação registrada</p>
              <p className="mt-1 text-xs text-ink-muted">Registre receitas renovadas para acompanhar custos e validades.</p>
            </div>
          ) : (
            filteredRenovacoes.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((renovacao: any) => (
              <motion.div
                key={renovacao.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => { trigger("vibrate"); router.push(`/saude/renovacao/detalhes?id=${renovacao.id}`); }}
                className="flex w-full items-start gap-3.5 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden cursor-pointer"
                style={{ borderLeft: "6px solid #38BDF8" }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-raised border border-surface-border/50 ml-1">
                  <Pill size={22} className="text-ice" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-semibold text-ink-primary">{renovacao.medicamentoNome}</p>
                    <span className="shrink-0 text-xs font-mono font-medium text-emerald-400">
                      {renovacao.preco ? `R$ ${Number(renovacao.preco).toFixed(2).replace(".", ",")}` : "SUS / Gratuito"}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted mt-0.5">{renovacao.medicamentoDosagem}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={12} className="text-ice" /> {formatDateDisplay(renovacao.data)}
                    </span>
                    {renovacao.observacoes && (
                      <span className="truncate max-w-[200px]">💬 {renovacao.observacoes}</span>
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
              onClick={() => { trigger("vibrate"); router.push("/saude/renovacao/nova"); }}
              className="flex items-center justify-center gap-2 shadow-lg shadow-ice/10"
            >
              <Plus size={16} /> Nova Renovação / Receita
            </Button>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}