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

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

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

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Stethoscope size={16} className="text-ice" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Agenda</p>
                </div>
                <h1 className="mt-1 truncate font-display text-xl font-semibold text-ink-primary">Consultas Médicas</h1>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-raised p-1 border border-surface-border/40">
            <button
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

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Filter size={14} className="text-ink-muted" />
            
            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "agendada" ? "todos" : "agendada"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "agendada"
                  ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Agendada
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "realizada" ? "todos" : "realizada"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "realizada"
                  ? "border-ice bg-ice/20 text-ice"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Realizada
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "cancelada" ? "todos" : "cancelada"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "cancelada"
                  ? "border-coral bg-coral/20 text-coral"
                  : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Cancelada
            </button>

            {filtroStatus !== "todos" && (
              <button
                onClick={() => { trigger("vibrate"); setFiltroStatus("todos"); }}
                className="text-[10px] font-medium text-coral bg-coral/10 px-2.5 py-1 rounded-full flex items-center gap-1"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </header>

        <section className="px-5 pt-6 space-y-4">
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
            <div className="space-y-3">
              {listaExibida.map((con, index) => {
                const hospitalNome = getHospitalNome(con.hospital_id);
                const { color, icon: StatusIcon } = getStatusConfig(con.status);
                const diasRestantes = getDaysUntil(con.data);
                const vencida = isReceitaVencidaSegura(con.data);
                const temHorario = con.horario && con.horario.trim().length > 0;
                return (
                  <motion.div
                    key={con.id}
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: index * 0.04 }}
                    onClick={() => { trigger("vibrate"); router.push(`/saude/consultas/detalhes?id=${con.id}`); }}
                    className="group cursor-pointer rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm transition-all active:scale-[0.98] hover:border-ice/30 relative overflow-hidden"
                    style={{ borderLeft: `4px solid ${color}` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div 
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                          style={{ backgroundColor: `${color}15`, color: color, borderColor: `${color}30` }}
                        >
                          <StatusIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold" style={{ color }}>
                              {formatDateDisplay(con.data)}
                            </span>
                            {temHorario && (
                              <span className="text-[10px] font-mono text-ink-muted">
                                • {con.horario}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              con.status === "agendada" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" :
                              con.status === "realizada" ? "bg-ice/10 text-ice border border-ice/20" :
                              "bg-coral/10 text-coral border border-coral/20"
                            }`}>
                              {con.status}
                            </span>
                            {vencida && con.status !== "realizada" && con.status !== "cancelada" && (
                              <span className="rounded-full bg-coral/20 px-2 py-0.5 text-[9px] font-bold text-coral border border-coral/20 uppercase">
                                Vencida
                              </span>
                            )}
                            {diasRestantes !== null && diasRestantes >= 0 && con.status === "agendada" && (
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${
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
                            <p className="text-xs text-ink-faint mt-1.5 line-clamp-1 italic">
                              "{con.motivo}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="self-center flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted group-hover:text-ice transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}