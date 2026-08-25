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
import { getClinicalTheme } from "@/lib/health-utils";
import { EmptyState } from "@/components/EmptyState";

/* ============================================================
   PÁGINA
   ============================================================ */

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
      <main className="relative min-h-screen bg-void pb-28">
        {/* ======================================================
            HEADER
            ====================================================== */}

        <header className="sticky top-0 z-30 border-b border-surface-border/30 bg-void/85 px-5 pb-4 pt-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-primary transition-transform active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-violet-400">REGISTROS CLÍNICOS</p>
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">CIDs e Diagnósticos</h1>
                <p className="text-xs text-ink-muted">{filteredCids.length} registros</p>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              BUSCA
              ---------------------------------------------------- */}

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-2xl bg-surface-raised/60 pl-9 text-sm"
            />
          </div>
        </header>

        {/* ======================================================
            LISTA
            ====================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
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
            filteredCids.map((cid, index) => {
              const insight = getCidInsights(cid.codigo);
              const medico = cid.medico_id ? medicosMap.get(cid.medico_id) : null;
              const theme = getClinicalTheme(cid.descricao || cid.codigo);
              const IconComp = theme.icon;

              return (
                <motion.article
                  key={cid.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
                  className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
                  style={{
                    borderColor: `${theme.hex}40`,
                    borderLeft: `6px solid ${theme.hex}`,
                  }}
                >
                  <div className="p-4 pl-5">
                    <button
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(`/saude/cids/detalhes?id=${cid.id}`);
                      }}
                      className="flex w-full items-start gap-3.5 text-left outline-none"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
                        style={{
                          backgroundColor: `${theme.hex}15`,
                          borderColor: `${theme.hex}30`,
                          color: theme.hex,
                        }}
                      >
                        <IconComp size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                            {cid.codigo}
                          </h3>
                          <span className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${theme.tagClass}`}>
                            CID
                          </span>
                          {insight && (
                            <span className="shrink-0 whitespace-nowrap text-[9px] text-ink-muted bg-surface-raised px-2 py-0.5 rounded-full">
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

                      <ChevronRight size={16} className="mt-2 shrink-0 text-ink-faint" />
                    </button>
                  </div>
                </motion.article>
              );
            })
          )}
        </section>
      </main>
    </PageTransition>
  );
}