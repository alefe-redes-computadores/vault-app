// app/saude/consultas/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Building2, 
  ChevronRight,
  Stethoscope,
  Filter,
  X,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import type { Consulta } from "@/lib/types";
import { useConsultas } from "@/hooks/useConsultas";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { EmptyState } from "@/components/EmptyState";
import { getDaysUntil } from "@/lib/health-utils";
import { isReceitaVencidaSegura } from "@/lib/health-insights";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";

/* ============================================================
   HELPERS
   ============================================================ */

function formatDateDisplay(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getStatusConfig(status: string): { color: string; icon: any } {
  switch (status) {
    case "agendada":
      return { color: "#34D399", icon: Clock };
    case "realizada":
      return { color: "#38BDF8", icon: CheckCircle2 };
    case "cancelada":
      return { color: "#EF4444", icon: XCircle };
    default:
      return { color: "#38BDF8", icon: Stethoscope };
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

export default function ConsultasPage() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();
  const { activePersonId } = useActivePersonId();
  
  const [abaAtiva, setAbaAtiva] = useState<"proximas" | "historico">("proximas");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "agendada" | "realizada" | "cancelada">("todos");

  const { consultas } = useConsultas();
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const hojeISO = new Date().toISOString().slice(0, 10);

  const { proximas, historico } = useMemo(() => {
    const prox: Consulta[] = [];
    const hist: Consulta[] = [];

    (consultas || []).forEach((c) => {
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
  }, [consultas, hojeISO, activePersonId]);

  const listaBase = abaAtiva === "proximas" ? proximas : historico;

  const listaExibida = useMemo(() => {
    if (filtroStatus === "todos") return listaBase;
    return listaBase.filter(c => c.status === filtroStatus);
  }, [listaBase, filtroStatus]);

  const getMedicoNome = (id?: string) => {
    if (!id) return "Não vinculado";
    const med = medicos.find((m) => m.id === id);
    return med ? `Dr(a). ${med.nome}` : "Médico não encontrado";
  };

  const getHospitalNome = (id?: string) => {
    if (!id) return null;
    const hosp = hospitais.find((h) => h.id === id);
    return hosp ? hosp.nome : null;
  };

  if (!consultas) return <CardListSkeleton />;

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
                  <Stethoscope size={16} className="text-ice" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Agenda</p>
                </div>
                <h1 className="truncate font-display text-xl font-semibold text-ink-primary">Consultas Médicas</h1>
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
              Próximas ({proximas.length})
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
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
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
                  ? "border-ice bg-ice/20 text-ice"
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
              icon={Stethoscope}
              title={
                abaAtiva === "proximas"
                  ? "Nenhuma consulta agendada"
                  : "Nenhuma consulta no histórico"
              }
              description={
                abaAtiva === "proximas"
                  ? "Agende uma nova consulta."
                  : "As consultas realizadas ou canceladas aparecerão aqui."
              }
            />
          ) : (
            listaExibida.map((con, index) => {
              const hospitalNome = getHospitalNome(con.hospital_id);
              const { color, icon: StatusIcon } = getStatusConfig(con.status);
              const diasRestantes = getDaysUntil(con.data);
              const vencida = isReceitaVencidaSegura(con.data);
              const temHorario = con.horario && con.horario.trim().length > 0;

              return (
                <motion.article
                  key={con.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.2) }}
                  className="group relative overflow-hidden rounded-[24px] border bg-surface shadow-md transition-all hover:bg-surface-raised"
                  style={{
                    borderColor: `${color}40`,
                    borderLeft: `6px solid ${color}`,
                  }}
                >
                  <div className="p-4 pl-5">
                    <button
                      type="button"
                      onClick={() => {
                        trigger("vibrate");
                        router.push(`/saude/consultas/detalhes?id=${con.id}`);
                      }}
                      className="flex w-full items-start gap-3.5 text-left outline-none"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner"
                        style={{
                          backgroundColor: `${color}15`,
                          borderColor: `${color}30`,
                          color,
                        }}
                      >
                        <StatusIcon size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-baseline gap-2 flex-wrap">
                          <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold" style={{ color }}>
                            {formatDateDisplay(con.data)}
                          </span>
                          {temHorario && (
                            <span className="shrink-0 whitespace-nowrap text-[10px] font-mono text-ink-muted">
                              • {con.horario}
                            </span>
                          )}
                          <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            con.status === "agendada" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                            con.status === "realizada" ? "bg-ice/10 text-ice border border-ice/20" :
                            "bg-coral/10 text-coral border border-coral/20"
                          }`}>
                            {con.status}
                          </span>
                          {vencida && con.status !== "realizada" && con.status !== "cancelada" && (
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-coral/20 px-2 py-0.5 text-[9px] font-bold text-coral border border-coral/20 uppercase">
                              Vencida
                            </span>
                          )}
                          {diasRestantes !== null && diasRestantes >= 0 && con.status === "agendada" && (
                            <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
                              diasRestantes <= 2 ? "bg-amber-400/20 text-amber-400 border-amber-400/30" :
                              "bg-ice/10 text-ice border-ice/20"
                            }`}>
                              {getDiasRestantesLabel(diasRestantes)}
                            </span>
                          )}
                        </div>

                        <h3 className="truncate font-semibold text-ink-primary text-base mt-1">
                          {getMedicoNome(con.medico_id)}
                        </h3>

                        {hospitalNome && (
                          <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-1">
                            <Building2 size={13} className="text-ink-faint shrink-0" />
                            <span className="truncate">{hospitalNome}</span>
                          </div>
                        )}

                        {con.motivo && (
                          <p className="text-xs text-ink-faint mt-1.5 truncate italic">
                            "{con.motivo}"
                          </p>
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