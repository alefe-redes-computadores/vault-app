// app/saude/exames/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FlaskConical,
  Search,
  Building2,
  ChevronRight,
  Calendar,
  Filter,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserRound,
  Activity,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/EmptyState";
import { useExames } from "@/hooks/useExames";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { getDaysUntil, getClinicalTheme } from "@/lib/health-utils";
import type { Exame, Person, Tratamento } from "@/lib/types";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function ExamesPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "vencido" | "valido" | "proximo">("todos");

  const { exames: allExames } = useExames();
  const persons = useLiveQuery(() => db.persons.toArray(), []) as Person[];
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];

  const personMap = useMemo(() => new Map((persons || []).map((p) => [p.id!, p.name])), [persons]);
  const tratamentoMap = useMemo(() => new Map(tratamentos.map((t) => [t.id, t])), [tratamentos]);

  const exames = useMemo(() => {
    if (!activePersonId) return allExames || [];
    return (allExames || []).filter((exame: Exame) => exame.person_id === activePersonId);
  }, [allExames, activePersonId]);

  type ExameComStatus = Exame & { vencido: boolean; proximo: boolean };

  const examesComStatus = useMemo<ExameComStatus[]>(() => {
    return (exames || []).map((exame: Exame) => {
      const dias = exame.data_retorno ? getDaysUntil(exame.data_retorno) : null;
      const vencido = exame.data_retorno ? isReceitaVencidaSegura(exame.data_retorno) : false;
      const proximo = dias !== null && dias >= 0 && dias <= 7 && !vencido;

      return { ...exame, vencido, proximo };
    });
  }, [exames]);

  const filteredExames = useMemo<ExameComStatus[]>(() => {
    let result = examesComStatus;

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        (exame) =>
          exame.nome?.toLowerCase().includes(term) ||
          exame.laboratorio?.toLowerCase().includes(term)
      );
    }

    if (filtroStatus === "vencido") {
      result = result.filter((exame) => exame.vencido);
    } else if (filtroStatus === "valido") {
      result = result.filter((exame) => !exame.vencido && !exame.proximo);
    } else if (filtroStatus === "proximo") {
      result = result.filter((exame) => exame.proximo);
    }

    return result.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [examesComStatus, search, filtroStatus]);

  if (!allExames) return <CardListSkeleton />;

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
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400">REGISTROS CLÍNICOS</p>
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">Exames e Laudos</h1>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              BUSCA
              ---------------------------------------------------- */}

          <div className="relative mt-4">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              placeholder="Buscar exame ou laboratório..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-2xl bg-surface-raised/60 pl-9 text-sm"
            />
          </div>

          {/* ----------------------------------------------------
              FILTROS
              ---------------------------------------------------- */}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted shrink-0" />

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "vencido" ? "todos" : "vencido"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "vencido"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Vencidos
            </button>

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "proximo" ? "todos" : "proximo"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "proximo"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Próximos
            </button>

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "valido" ? "todos" : "valido"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "valido"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Válidos
            </button>

            {filtroStatus !== "todos" && (
              <button
                type="button"
                onClick={() => { trigger("vibrate"); setFiltroStatus("todos"); }}
                className="text-[10px] font-medium text-coral bg-coral/10 px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </header>

        {/* ======================================================
            LISTA
            ====================================================== */}

        <section className="space-y-3.5 px-5 pt-4">
          {filteredExames.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title={
                search || filtroStatus !== "todos"
                  ? "Nenhum exame encontrado"
                  : "Nenhum exame cadastrado"
              }
              description={
                search || filtroStatus !== "todos"
                  ? "Tente ajustar a busca ou os filtros."
                  : "Cadastre seus exames e laudos."
              }
            />
          ) : (
            filteredExames.map((exame, index) => {
              const personName = personMap.get(exame.person_id || "");
              const corBorda = exame.vencido ? "#EF4444" : exame.proximo ? "#F59E0B" : "#10B981";
              const temHorario = exame.horario && exame.horario.trim().length > 0;

              const primeirosTratamentos = (exame.tratamento_ids || [])
                .slice(0, 2)
                .map((id) => tratamentoMap.get(id))
                .filter(Boolean) as Tratamento[];

              return (
                <motion.article
                  key={exame.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
                  className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
                  style={{
                    borderColor: `${corBorda}40`,
                    borderLeft: `6px solid ${corBorda}`,
                  }}
                >
                  <div className="p-4 pl-5">
                    <button
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(`/saude/exames/detalhes?id=${exame.id}`);
                      }}
                      className="flex w-full items-start gap-3.5 text-left outline-none"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
                        style={{
                          backgroundColor: `${corBorda}15`,
                          borderColor: `${corBorda}30`,
                          color: corBorda,
                        }}
                      >
                        <FlaskConical size={22} className="text-emerald-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2 flex-wrap">
                          <h3 className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink-primary">
                            {exame.nome}
                          </h3>
                          {personName && (
                            <span className="shrink-0 whitespace-nowrap rounded-full border border-surface-border/50 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-1">
                              <UserRound size={10} />
                              {personName}
                            </span>
                          )}
                          {exame.vencido ? (
                            <span className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[8px] font-bold uppercase bg-coral/20 text-coral px-1.5 py-0.5 rounded-full">
                              <AlertTriangle size={10} /> Vencido
                            </span>
                          ) : exame.proximo ? (
                            <span className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[8px] font-bold uppercase bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                              <Clock size={10} /> Próximo
                            </span>
                          ) : exame.data_retorno ? (
                            <span className="shrink-0 whitespace-nowrap flex items-center gap-1 text-[8px] font-bold uppercase bg-emerald-400/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Válido
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          {exame.laboratorio && (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 size={12} className="text-ink-faint" /> {exame.laboratorio}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-ink-faint" /> {formatDateDisplay(exame.data)}
                          </span>
                          {temHorario && (
                            <span className="text-[10px] font-mono text-ink-muted">• {exame.horario}</span>
                          )}
                        </div>

                        {primeirosTratamentos.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {primeirosTratamentos.map((t) => {
                              const theme = getClinicalTheme(t.nome);
                              const Icon = theme.icon;
                              return (
                                <span
                                  key={t.id}
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide border max-w-[120px] truncate ${theme.tagClass}`}
                                >
                                  <Icon size={9} />
                                  {t.nome}
                                </span>
                              );
                            })}
                            {(exame.tratamento_ids?.length || 0) > 2 && (
                              <span className="text-[8px] text-ink-muted">+{(exame.tratamento_ids?.length || 0) - 2}</span>
                            )}
                          </div>
                        )}
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