// app/saude/cids/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  FileText,
  Calendar,
  Stethoscope,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { Input } from "@/components/ui/Input";
import { useCids } from "@/hooks/useCids";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { getCidInsights } from "@/lib/health-insights";
import { getClinicalTheme } from "@/lib/health-utils"; // UTILITÁRIO IMPORTADO
import { EmptyState } from "@/components/EmptyState";

export default function CidsPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { cids } = useCids();
  const { activePersonId } = useActivePersonId();
  const [search, setSearch] = useState("");

  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const medicosMap = useMemo(() => new Map(medicos.map((m) => [m.id, m])), [medicos]);

  const filteredCids = useMemo(() => {
    if (!cids) return [];
    
    // FILTRO ROBUSTO MANTIDO INTACTO
    let result = cids.filter((c) => {
      return !activePersonId || !c.person_id || c.person_id === activePersonId;
    });

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.codigo.toLowerCase().includes(lower) ||
          c.descricao.toLowerCase().includes(lower)
      );
    }
    return result.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [cids, search, activePersonId]);

  if (!cids) return <CardListSkeleton />;

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
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-400">REGISTROS CLÍNICOS</p>
              <h1 className="font-display text-xl font-semibold text-ink-primary truncate">
                CIDs e Diagnósticos
              </h1>
              <p className="text-xs text-ink-muted">{filteredCids.length} registros</p>
            </div>
          </div>

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-surface-border/50 bg-surface-raised pl-9"
            />
          </div>
        </header>

        <section className="px-5 pt-5 space-y-3">
          {filteredCids.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={search ? "Nenhum CID encontrado" : "Nenhum CID cadastrado"}
              description={
                search
                  ? "Tente ajustar a busca."
                  : "Cadastre seus diagnósticos para acompanhar tratamentos."
              }
            />
          ) : (
            filteredCids.map((cid) => {
              const insight = getCidInsights(cid.codigo);
              const medico = cid.medico_id ? medicosMap.get(cid.medico_id) : null;
              
              // TEMA DINÂMICO APLICADO
              const theme = getClinicalTheme(cid.descricao || cid.codigo);
              const IconComp = theme.icon;

              return (
                <motion.button
                  key={cid.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(`/saude/cids/detalhes?id=${cid.id}`);
                  }}
                  className="flex w-full items-start gap-3 rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 relative overflow-hidden"
                  style={{ borderLeft: `6px solid ${theme.hex}` }}
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${theme.bgClass} ${theme.textClass} ${theme.borderClass}`}>
                    <IconComp size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink-primary">
                        {cid.codigo}
                      </p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${theme.tagClass}`}>
                        CID
                      </span>
                      {insight && (
                        <span className="shrink-0 text-[9px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">
                          {insight.categoria}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-ink-muted mt-0.5">{cid.descricao}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      {cid.data_diagnostico && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-ink-faint" />
                          {new Date(cid.data_diagnostico).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {medico && (
                        <span className="flex items-center gap-1">
                          <Stethoscope size={12} className="text-ice" />
                          Dr(a). {medico.nome}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className="mt-1 shrink-0 text-ink-faint" />
                </motion.button>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}
