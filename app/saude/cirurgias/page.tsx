// app/saude/cirurgias/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Building2, 
  ChevronRight,
  Activity,
  Filter,
  X
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Cirurgia } from "@/lib/types";
import { useCirurgias } from "@/hooks/useCirurgias";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { EmptyState } from "@/components/EmptyState";
import { getDaysUntil } from "@/lib/health-utils";
import { isReceitaVencidaSegura } from "@/lib/health-insights";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "agendada":
      return "#F59E0B";
    case "realizada":
      return "#34D399";
    case "cancelada":
      return "#EF4444";
    default:
      return "#F59E0B";
  }
}

function getDiasRestantesLabel(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias === 0) return "Hoje";
  if (dias < 0) return `Há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? 's' : ''}`;
  return `Em ${dias} dia${dias > 1 ? 's' : ''}`;
}

/* ============================================================
   PÁGINA
   ============================================================ */

export default function CirurgiasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  
  const [abaAtiva, setAbaAtiva] = useState<"proximas" | "historico">("proximas");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "agendada" | "realizada" | "cancelada">("todos");

  const { cirurgias } = useCirurgias();
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const hojeISO = new Date().toISOString().slice(0, 10);

  const { proximas, historico } = useMemo(() => {
    const prox: Cirurgia[] = [];
    const hist: Cirurgia[] = [];

    (cirurgias || []).forEach((c) => {
      const pertenceAoPerfil = !activePersonId || !c.person_id || c.person_id === activePersonId;
      if (!pertenceAoPerfil) return;

      const dataSegura = c.data || "";
      const isPassada = dataSegura < hojeISO || c.status === "realizada" || c.status === "cancelada";
      
      if (isPassada) {
        hist.push(c);
      } else {
        prox.push(c);
      }
    });

    prox.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
    hist.sort((a, b) => (b.data || "").localeCompare(a.data || ""));

    return { proximas: prox, historico: hist };
  }, [cirurgias, hojeISO, activePersonId]);

  const listaBase = abaAtiva === "proximas" ? proximas : historico;

  const listaExibida = useMemo(() => {
    if (filtroStatus === "todos") return listaBase;
    return listaBase.filter(c => c.status === filtroStatus);
  }, [listaBase, filtroStatus]);

  const getMedicoNome = (id?: string) => {
    if (!id) return "Equipe não especificada";
    const med = medicos.find((m) => m.id === id);
    return med ? `Dr(a). ${med.nome}` : "Médico não encontrado";
  };

  const getHospitalNome = (id?: string) => {
    if (!id) return null;
    const hosp = hospitais.find((h) => h.id === id);
    return hosp ? hosp.nome : null;
  };

  if (!cirurgias) return <CardListSkeleton />;

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
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-coral" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-coral/90">Clínico</p>
                </div>
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">Cirurgias</h1>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              ABAS
              ---------------------------------------------------- */}

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-raised p-1 border border-surface-border/40">
            <button
              type="button"
              onClick={() => { trigger("vibrate"); setAbaAtiva("proximas"); }}
              className={`rounded-xl py-2.5 text-xs font-medium transition-all ${
                abaAtiva === "proximas"
                  ? "bg-surface text-ink-primary shadow-sm border border-surface-border/50"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              Agendadas ({proximas.length})
            </button>
            <button
              type="button"
              onClick={() => { trigger("vibrate"); setAbaAtiva("historico"); }}
              className={`rounded-xl py-2.5 text-xs font-medium transition-all ${
                abaAtiva === "historico"
                  ? "bg-surface text-ink-primary shadow-sm border border-surface-border/50"
                  : "text-ink-muted hover:text-ink-primary"
              }`}
            >
              Histórico ({historico.length})
            </button>
          </div>

          {/* ----------------------------------------------------
              FILTROS
              ---------------------------------------------------- */}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted shrink-0" />
            
            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "agendada" ? "todos" : "agendada"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "agendada"
                  ? "border-amber-400 bg-amber-400/20 text-amber-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Agendada
            </button>

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "realizada" ? "todos" : "realizada"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "realizada"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Realizada
            </button>

            <button
              type="button"
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "cancelada" ? "todos" : "cancelada"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all shrink-0 ${
                filtroStatus === "cancelada"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Cancelada
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
          {listaExibida.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={
                abaAtiva === "proximas"
                  ? "Nenhuma cirurgia agendada"
                  : "Nenhum procedimento no histórico"
              }
              description={
                abaAtiva === "proximas"
                  ? "Cadastre uma nova cirurgia."
                  : "As cirurgias realizadas ou canceladas aparecerão aqui."
              }
            />
          ) : (
            listaExibida.map((cir, index) => {
              const hospitalNome = getHospitalNome(cir.hospital_id);
              const corBorda = getStatusColor(cir.status);
              const diasRestantes = getDaysUntil(cir.data);
              const vencida = isReceitaVencidaSegura(cir.data);
              const temHorario = cir.horario && cir.horario.trim().length > 0;

              return (
                <motion.article
                  key={cir.id}
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
                        router.push(`/saude/cirurgias/detalhes?id=${cir.id}`);
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
                        <Activity size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2 flex-wrap">
                          <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold" style={{ color: corBorda }}>
                            {formatDateDisplay(cir.data)}
                          </span>
                          {temHorario && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] font-mono text-ink-muted">
                              • {cir.horario}
                            </span>
                          )}
                          <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            cir.status === "agendada" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" :
                            cir.status === "realizada" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                            "bg-coral/10 text-coral border border-coral/20"
                          }`}>
                            {cir.status}
                          </span>
                          {vencida && cir.status !== "realizada" && cir.status !== "cancelada" && (
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-coral/20 px-2 py-0.5 text-[9px] font-bold text-coral border border-coral/20 uppercase">
                              Vencida
                            </span>
                          )}
                          {diasRestantes !== null && diasRestantes >= 0 && cir.status === "agendada" && (
                            <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                              diasRestantes <= 2 ? "bg-amber-400/20 text-amber-400 border-amber-400/30" :
                              "bg-ice/10 text-ice border-ice/20"
                            }`}>
                              {getDiasRestantesLabel(diasRestantes)}
                            </span>
                          )}
                        </div>

                        <h3 className="truncate font-semibold text-ink-primary text-base mt-1">
                          {cir.procedimento}
                        </h3>

                        {hospitalNome && (
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-1">
                            <Building2 size={13} className="text-ink-faint shrink-0" />
                            <span className="truncate">{hospitalNome}</span>
                          </div>
                        )}

                        <p className="text-xs text-ink-faint mt-1.5 truncate">
                          {getMedicoNome(cir.medico_id)}
                        </p>
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