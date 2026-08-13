"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, Circle, Pill, Clock, 
  CircleDot, AlertTriangle, ShieldAlert, Brain, Flame, HeartPulse, Activity, Stethoscope 
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { computeEstoqueInfo } from "@/lib/health-utils";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getTratamentoIcon(nome: string) {
  const n = (nome || "").toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function getPeriodoDoDia(horario: string) {
  const [h] = horario.split(":").map(Number);
  if (h >= 5 && h < 12) return { key: "manha", label: "Manhã", sub: "Comece o dia com foco" };
  if (h >= 12 && h < 18) return { key: "tarde", label: "Tarde", sub: "Manutenção e constância" };
  return { key: "noite", label: "Noite", sub: "Encerramento e descanso" };
}

interface DoseItemExt {
  medicamentoId: string;
  medicamentoNome: string;
  dosagem: string;
  horario: string;
  tomada: boolean;
  cor: string;
  estoqueRestante: number;
  medicoNome?: string;
  tratamentoNome?: string;
}

export default function HojePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const hoje = todayISO();

  const { medicamentos } = useMedicamentos();
  const { doseLogs, marcarDose } = useDoseLogs(hoje);

  // Busca tratamentos e médicos para enriquecer os dados relacionais
  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];

  const doses = useMemo<DoseItemExt[]>(() => {
    const list: DoseItemExt[] = [];
    for (const med of medicamentos || []) {
      if (!med.id || med.status === "descontinuado" || !med.estoque_horarios || med.estoque_horarios.length === 0) continue;
      
      const estoqueInfo = computeEstoqueInfo(med);
      const medicoObj = medicos.find(m => m.id === med.medico_id);
      
      // Busca vínculo de tratamento (direto ou via N:N)
      const tratamentoObj = tratamentos.find(t => t.id === med.tratamento_id);

      for (const horario of med.estoque_horarios) {
        if (!horario) continue;
        const log = (doseLogs || []).find(
          (l) => l.medicamento_id === med.id && l.horario === horario
        );

        list.push({
          medicamentoId: med.id,
          medicamentoNome: med.nome,
          dosagem: med.dosagem,
          horario,
          tomada: !!log?.tomado_em,
          cor: (med as any).cor || "#8B5CF6",
          estoqueRestante: estoqueInfo?.quantidadeRestante ?? 0,
          medicoNome: medicoObj?.nome || med.medico,
          tratamentoNome: tratamentoObj?.nome,
        });
      }
    }
    return list.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [medicamentos, doseLogs, medicos, tratamentos]);

  // Agrupamento por Período do Dia (Manhã, Tarde, Noite)
  const dosesAgrupadas = useMemo(() => {
    const grupos: Record<string, { label: string; sub: string; items: DoseItemExt[] }> = {
      manha: { label: "Manhã", sub: "Início do dia", items: [] },
      tarde: { label: "Tarde", sub: "Período da tarde", items: [] },
      noite: { label: "Noite", sub: "Final do dia", items: [] },
    };

    doses.forEach((d) => {
      const p = getPeriodoDoDia(d.horario);
      if (grupos[p.key]) {
        grupos[p.key].items.push(d);
      }
    });

    return Object.entries(grupos).filter(([_, g]) => g.items.length > 0);
  }, [doses]);

  const totalTomadas = doses.filter((d) => d.tomada).length;
  const isLoading = medicamentos === undefined || doseLogs === undefined;

  const handleToggle = async (item: DoseItemExt) => {
    trigger(item.tomada ? "vibrate" : "success");
    await marcarDose(item.medicamentoId, hoje, item.horario, !item.tomada);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.back();
                }}
                aria-label="Voltar"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-ice" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                    Rotina Diária
                  </p>
                </div>
                <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-primary">
                  Cronograma de Hoje
                </h1>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-xs font-bold text-ice bg-ice/10 px-3 py-1.5 rounded-full border border-ice/20">
                {totalTomadas} / {doses.length} tomadas
              </span>
            </div>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          {doses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm"
            >
              <div className="glow-ice mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-ice/15 bg-surface-raised">
                <Pill size={22} className="text-ice/60" />
              </div>
              <h3 className="font-display text-base font-semibold text-ink-primary">
                Nada programado para hoje
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                Cadastre horários nos seus medicamentos para gerenciar sua rotina diária aqui.
              </p>
            </motion.div>
          ) : (
            dosesAgrupadas.map(([key, grupo], gIndex) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                      {grupo.label}
                    </h2>
                    <p className="text-[11px] text-ink-muted">{grupo.sub}</p>
                  </div>
                  <span className="text-[10px] font-mono text-ink-faint">
                    {grupo.items.filter(i => i.tomada).length}/{grupo.items.length} concluídos
                  </span>
                </div>

                <div className="space-y-2.5">
                  {grupo.items.map((item, index) => {
                    const isAtrasado = !item.tomada && item.horario < horaAtual;
                    const tratamentoCor = item.cor || "#8B5CF6";

                    return (
                      <motion.div
                        key={`${item.medicamentoId}-${item.horario}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min((gIndex * 0.05) + (index * 0.03), 0.3) }}
                        onClick={() => handleToggle(item)}
                        className={`group relative flex w-full cursor-pointer items-center justify-between gap-4 rounded-[24px] border p-4 text-left shadow-sm transition-all active:scale-[0.985] overflow-hidden ${
                          item.tomada
                            ? "border-emerald-400/30 bg-emerald-400/5 opacity-75"
                            : "border-surface-border/50 bg-surface hover:border-surface-border"
                        }`}
                        style={{ borderLeft: `6px solid ${tratamentoCor}` }}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="shrink-0">
                            {item.tomada ? (
                              <CheckCircle2 size={24} className="text-emerald-400" />
                            ) : (
                              <Circle size={24} className="text-ink-faint group-hover:text-ink-muted transition-colors" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`truncate text-sm font-semibold ${
                                  item.tomada ? "text-ink-muted line-through" : "text-ink-primary"
                                }`}
                              >
                                {item.medicamentoNome}
                              </p>
                              <span className="text-xs font-medium text-ink-muted">
                                {item.dosagem}
                              </span>
                            </div>

                            {/* Tags Cruzadas: Tratamento e Médico */}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {item.tratamentoName && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-violet-400/10 text-violet-300 border border-violet-400/20">
                                  {item.tratamentoName}
                                </span>
                              )}
                              {item.medicoNome && (
                                <span className="text-[10px] text-ink-muted flex items-center gap-1">
                                  <Stethoscope size={10} className="text-ink-faint" /> Dr(a). {item.medicoNome}
                                </span>
                              )}
                            </div>

                            {/* Alerta de Estoque Baixo */}
                            {item.estoqueRestante <= 5 && !item.tomada && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-coral">
                                <AlertTriangle size={12} /> Estoque crítico ({item.estoqueRestante} restantes)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Horário da Dose */}
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono font-bold ${
                              item.tomada
                                ? "bg-emerald-400/15 text-emerald-400"
                                : isAtrasado
                                ? "bg-coral/15 text-coral border border-coral/30 animate-pulse"
                                : "bg-ice/10 text-ice border border-ice/20"
                            }`}
                          >
                            <Clock size={12} />
                            {item.horario}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </PageTransition>
  );
}
