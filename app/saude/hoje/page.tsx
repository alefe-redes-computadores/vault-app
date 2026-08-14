"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, Circle, Pill, Clock, 
  AlertTriangle, ShieldAlert, Brain, Flame, HeartPulse, Activity, Stethoscope, Calendar, FlaskConical, X, DollarSign
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddRenovacao, safeUpdateMedicamento } from "@/lib/db";
import { computeEstoqueInfo, getLocalTodayISO } from "@/lib/health-utils";
import { useToast } from "@/components/ToastProvider";

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
  unidadeMedida: string;
  unidadePorDose: number;
  medicoNome?: string;
  tratamentoNome?: string;
}

export default function HojePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  // ✅ CORREÇÃO 1: Usando a data baseada no fuso horário local
  const hoje = getLocalTodayISO();

  const { medicamentos } = useMedicamentos();
  const { doseLogs, marcarDose } = useDoseLogs(hoje);

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];

  const consultas = useLiveQuery(() => db.table("consultas").where("data").equals(hoje).toArray(), [hoje]) || [];
  const cirurgias = useLiveQuery(() => db.table("cirurgias").where("data").equals(hoje).toArray(), [hoje]) || [];
  const examesDoDia = useLiveQuery(() => db.table("exames").where("data").equals(hoje).toArray(), [hoje]) || [];

  const [modalAberto, setModalAberto] = useState(false);
  const [medicamentoSelecionado, setMedicamentoSelecionado] = useState<any>(null);
  const [precoRenovacao, setPrecoRenovacao] = useState("");
  const [observacoesRenovacao, setObservacoesRenovacao] = useState("");
  const [adicionarMaisEstoque, setAdicionarMaisEstoque] = useState(30);
  
  // ✅ CORREÇÃO 2: Trava anti-race condition mantida
  const [processandoDoseId, setProcessandoDoseId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const doses = useMemo<DoseItemExt[]>(() => {
    const list: DoseItemExt[] = [];
    for (const med of medicamentos || []) {
      if (!med.id || med.status === "descontinuado" || !med.estoque_horarios || med.estoque_horarios.length === 0) continue;
      
      const estoqueInfo = computeEstoqueInfo(med);
      const medicoObj = medicos.find(m => m.id === med.medico_id);
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
          unidadeMedida: med.estoque_unidade_medida || "unidades",
          unidadePorDose: med.estoque_unidade_por_dose || 1,
          medicoNome: medicoObj?.nome || med.medico,
          tratamentoNome: tratamentoObj?.nome,
        });
      }
    }
    return list.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [medicamentos, doseLogs, medicos, tratamentos]);

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
    if (processandoDoseId) return;

    const chaveDose = `${item.medicamentoId}-${item.horario}`;
    setProcessandoDoseId(chaveDose);

    const proximaTomada = !item.tomada;
    trigger(proximaTomada ? "success" : "vibrate");

    try {
      await marcarDose(item.medicamentoId, hoje, item.horario, proximaTomada);

      const medOriginal = medicamentos?.find(m => m.id === item.medicamentoId);
      if (medOriginal && typeof medOriginal.estoque_quantidade === "number") {
        const delta = proximaTomada ? -item.unidadePorDose : item.unidadePorDose;
        const novoEstoque = Math.max(0, (medOriginal.estoque_quantidade || 0) + delta);

        await safeUpdateMedicamento(item.medicamentoId, {
          estoque_quantidade: novoEstoque,
          estoque_data_referencia: hoje
        });

        if (proximaTomada && novoEstoque <= 3) {
          setMedicamentoSelecionado(medOriginal);
          setModalAberto(true);
        }
      }
    } catch (e) {
      console.error("Erro na dose:", e);
      showToast("Erro ao atualizar dose", "error");
    } finally {
      setProcessandoDoseId(null);
    }
  };

  const handleSalvarRenovacaoDoModal = async () => {
    if (!medicamentoSelecionado?.id || isProcessing) return;

    setIsProcessing(true);
    trigger("success");

    try {
      await safeAddRenovacao({
        user_id: medicamentoSelecionado.user_id,
        medicamento_id: medicamentoSelecionado.id,
        data: hoje,
        preco: precoRenovacao ? Number(precoRenovacao.replace(",", ".")) : undefined,
        observacoes: observacoesRenovacao || "Renovação rápida via alerta"
      });

      const estoqueAtual = medicamentoSelecionado.estoque_quantidade || 0;
      await safeUpdateMedicamento(medicamentoSelecionado.id, {
        estoque_quantidade: estoqueAtual + Number(adicionarMaisEstoque),
        estoque_data_referencia: hoje
      });

      showToast("Sucesso!", "success");
      setModalAberto(false);
      setPrecoRenovacao("");
      setObservacoesRenovacao("");
    } catch (e) {
      console.error("Erro ao renovar:", e);
      showToast("Erro ao renovar", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { trigger("vibrate"); router.back(); }}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
              >
                <ArrowLeft size={18} className="text-ink-primary" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-ice" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">Rotina Diária</p>
                </div>
                <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-primary">Cronograma de Hoje</h1>
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
          {(consultas.length > 0 || cirurgias.length > 0 || examesDoDia.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Calendar size={16} className="text-coral" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">Compromissos de Hoje</h2>
              </div>
              <div className="space-y-2.5">
                {consultas.map((c: any) => (
                  <div key={c.id} onClick={() => router.push(`/saude/consultas/detalhes?id=${c.id}`)} className="flex items-center justify-between rounded-[24px] border border-ice/30 bg-ice/5 p-4 cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice/20 text-ice"><Stethoscope size={18} /></div>
                      <div>
                        <p className="text-sm font-semibold text-ink-primary">Consulta agendada</p>
                        <p className="text-xs text-ink-muted">{c.especialidade} • Dr(a). {c.medico}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-ice font-bold bg-ice/10 px-2.5 py-1 rounded-full">Hoje</span>
                  </div>
                ))}
                {cirurgias.map((cir: any) => (
                  <div key={cir.id} onClick={() => router.push(`/saude/cirurgias/detalhes?id=${cir.id}`)} className="flex items-center justify-between rounded-[24px] border border-coral/30 bg-coral/5 p-4 cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/20 text-coral"><Activity size={18} /></div>
                      <div>
                        <p className="text-sm font-semibold text-ink-primary">Procedimento Cirúrgico</p>
                        <p className="text-xs text-ink-muted">{cir.procedimento}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-coral font-bold bg-coral/10 px-2.5 py-1 rounded-full">Hoje</span>
                  </div>
                ))}
                {examesDoDia.map((ex: any) => (
                  <div key={ex.id} onClick={() => router.push(`/saude/exames/detalhes?id=${ex.id}`)} className="flex items-center justify-between rounded-[24px] border border-emerald-400/30 bg-emerald-400/5 p-4 cursor-pointer active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400"><FlaskConical size={18} /></div>
                      <div>
                        <p className="text-sm font-semibold text-ink-primary">Realização de Exame</p>
                        <p className="text-xs text-ink-muted">{ex.nome}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-400/10 px-2.5 py-1 rounded-full">Hoje</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {doses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm">
              <Pill size={22} className="text-ice/60 mb-4" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Nada programado para hoje</h3>
              <p className="text-sm text-ink-muted mt-2">Cadastre horários nos medicamentos para gerenciar sua rotina aqui.</p>
            </div>
          ) : (
            dosesAgrupadas.map(([key, grupo], gIndex) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">{grupo.label}</h2>
                    <p className="text-[11px] text-ink-muted">{grupo.sub}</p>
                  </div>
                  <span className="text-[10px] font-mono text-ink-faint">{grupo.items.filter(i => i.tomada).length}/{grupo.items.length} concluídos</span>
                </div>
                <div className="space-y-2.5">
                  {grupo.items.map((item) => {
                    const isAtrasado = !item.tomada && item.horario < horaAtual;
                    const tratamentoCor = item.cor || "#8B5CF6";
                    const isProcessando = processandoDoseId === `${item.medicamentoId}-${item.horario}`;

                    return (
                      <div
                        key={`${item.medicamentoId}-${item.horario}`}
                        onClick={() => handleToggle(item)}
                        style={{ borderLeft: `6px solid ${tratamentoCor}` }}
                        className={`group relative flex w-full cursor-pointer items-center justify-between gap-4 rounded-[24px] border p-4 text-left shadow-sm transition-all active:scale-[0.985] ${
                          item.tomada ? "border-emerald-400/30 bg-emerald-400/5 opacity-75" : "border-surface-border/50 bg-surface"
                        } ${isProcessando ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {item.tomada ? <CheckCircle2 size={24} className="text-emerald-400" /> : <Circle size={24} className="text-ink-faint" />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`truncate text-sm font-semibold ${item.tomada ? "text-ink-muted line-through" : "text-ink-primary"}`}>{item.medicamentoNome}</p>
                              <span className="text-xs font-medium text-ink-muted">{item.dosagem}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {item.tratamentoNome && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-violet-400/10 text-violet-300">{item.tratamentoNome}</span>}
                              {item.medicoNome && <span className="text-[10px] text-ink-muted flex items-center gap-1"><Stethoscope size={10} /> Dr(a). {item.medicoNome}</span>}
                            </div>
                            {item.estoqueRestante <= 3 && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-coral animate-pulse">
                                <AlertTriangle size={12} /> Estoque crítico ({item.estoqueRestante} {item.unidadeMedida})
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono font-bold ${item.tomada ? "bg-emerald-400/15 text-emerald-400" : isAtrasado ? "bg-coral/15 text-coral border border-coral/30 animate-pulse" : "bg-ice/10 text-ice border border-ice/20"}`}>
                          <Clock size={12} /> {item.horario}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        <AnimatePresence>
          {modalAberto && medicamentoSelecionado && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-[32px] border border-surface-border bg-surface p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/20 text-coral"><AlertTriangle size={20} /></div>
                    <div>
                      <h3 className="font-display text-base font-bold text-ink-primary">Estoque Baixo!</h3>
                      <p className="text-xs text-ink-muted">{medicamentoSelecionado.nome}</p>
                    </div>
                  </div>
                  <button onClick={() => setModalAberto(false)} className="text-ink-muted hover:text-ink-primary"><X size={18} /></button>
                </div>
                <p className="text-xs text-ink-muted">Deseja registrar a renovação e repor o estoque no sistema?</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-ink-muted block mb-1">Unidades a adicionar</label>
                    <input type="number" value={adicionarMaisEstoque} onChange={(e) => setAdicionarMaisEstoque(Number(e.target.value))} className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-ice" />
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-muted block mb-1">Preço pago (R$) — Opcional</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                      <input type="text" placeholder="0,00" value={precoRenovacao} onChange={(e) => setPrecoRenovacao(e.target.value)} className="w-full rounded-2xl border border-surface-border bg-surface-raised pl-10 pr-4 py-3 text-sm text-ink-primary font-mono outline-none focus:border-ice" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-ink-muted block mb-1">Observações</label>
                    <input type="text" placeholder="Ex: Farmácia X / SUS" value={observacoesRenovacao} onChange={(e) => setObservacoesRenovacao(e.target.value)} className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-ice" />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button onClick={() => setModalAberto(false)} className="flex-1 rounded-2xl border border-surface-border bg-surface-raised py-3 text-xs font-semibold text-ink-muted">Depois</button>
                  <button onClick={handleSalvarRenovacaoDoModal} disabled={isProcessing} className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-semibold text-void shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    {isProcessing ? "Salvando..." : "Repor e Renovar"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
