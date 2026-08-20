// app/hoje/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Pill,
  Clock,
  AlertTriangle,
  Stethoscope,
  Calendar,
  FlaskConical,
  X,
  DollarSign,
  Filter,
  XCircle,
  Building2,
  MapPin,
  FileWarning,
  TrendingUp,
  AlertOctagon,
  Info,
  Activity,
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddRenovacao, safeUpdateMedicamento } from "@/lib/db";
import {
  computeEstoqueInfo,
  getLocalTodayISO,
  getDaysUntil,
} from "@/lib/health-utils";
import {
  sugerirRenovacao,
  isReceitaVencidaSegura,
  analisarComportamentoUso,
  analisarRotinaDiaria,
} from "@/lib/health-insights";
import { useToast } from "@/components/ToastProvider";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import type { Tratamento } from "@/lib/types";

type FiltroStatus = "todos" | "tomados" | "pendentes" | "ignorados";
type FiltroPeriodo = "todos" | "manha" | "tarde" | "noite";
type FiltroCompromisso = "todos" | "consultas" | "cirurgias" | "exames";

function getPeriodoDoDia(horario: string) {
  const [h] = horario.split(":").map(Number);
  if (h >= 5 && h < 12) return { key: "manha", label: "Manhã", sub: "Comece o dia com foco" };
  if (h >= 12 && h < 18) return { key: "tarde", label: "Tarde", sub: "Manutenção e constância" };
  return { key: "noite", label: "Noite", sub: "Encerramento e descanso" };
}

function getDiasRestantesEstilo(dias: number | null | undefined) {
  if (dias === null || dias === undefined) return { cor: "text-ink-muted", bg: "bg-surface", label: "Indefinido", pulse: false };
  if (dias <= 3) return { cor: "text-coral", bg: "bg-coral/10", label: "Urgente", pulse: true };
  if (dias <= 7) return { cor: "text-amber-400", bg: "bg-amber-400/10", label: "Em breve", pulse: false };
  if (dias <= 14) return { cor: "text-amber-300", bg: "bg-amber-300/5", label: "Atenção", pulse: false };
  return { cor: "text-emerald-400", bg: "bg-emerald-400/10", label: "Tranquilo", pulse: false };
}

interface DoseItemExt {
  medicamentoId: string;
  medicamentoNome: string;
  dosagem: string;
  horario: string;
  tomada: boolean;
  ignorada: boolean;
  cor: string;
  estoqueRestante: number;
  estoqueTotal: number;
  unidadeMedida: string;
  unidadePorDose: number;
  medicoNome?: string;
  medicoId?: string;
  tratamentoNome?: string;
  tratamentoId?: string;
  tratamentoCor?: string;
  farmaciaNome?: string;
  farmaciaId?: string;
  estabelecimentoNome?: string;
  estabelecimentoId?: string;
  proximaRenovacao?: string;
  diasRestantes?: number | null;
  insight?: { deveRenovar: boolean; mensagem: string; urgencia: "alta" | "media" | "nenhuma" };
  receitaVencida?: boolean;
  comportamento?: any;
}

export default function HojePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const hoje = getLocalTodayISO();
  const { activePersonId } = useActivePersonId();

  const { medicamentos } = useMedicamentos();
  const { doseLogs, marcarComoTomada: marcarDose, marcarComoIgnorada } = useDoseLogs(hoje);

  const tratamentos = useLiveQuery(
    () => activePersonId ? db.tratamentos.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId]
  ) || [];
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const farmacias = useLiveQuery(() => db.farmacias.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const consultas = useLiveQuery(
    () => activePersonId ? db.consultas.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId]
  ) || [];
  const cirurgias = useLiveQuery(
    () => activePersonId ? db.cirurgias.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId]
  ) || [];
  const exames = useLiveQuery(
    () => activePersonId ? db.exames.where('person_id').equals(activePersonId).toArray() : [],
    [activePersonId]
  ) || [];

  const consultasHoje = useMemo(
    () => consultas.filter((c: any) => c.data === hoje),
    [consultas, hoje]
  );
  const cirurgiasHoje = useMemo(
    () => cirurgias.filter((c: any) => c.data === hoje),
    [cirurgias, hoje]
  );
  const examesHoje = useMemo(
    () => exames.filter((e: any) => e.data === hoje),
    [exames, hoje]
  );

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todos");
  const [filtroCompromisso, setFiltroCompromisso] = useState<FiltroCompromisso>("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [medicamentoSelecionado, setMedicamentoSelecionado] = useState<any>(null);
  const [precoRenovacao, setPrecoRenovacao] = useState("");
  const [observacoesRenovacao, setObservacoesRenovacao] = useState("");
  const [adicionarMaisEstoque, setAdicionarMaisEstoque] = useState(30);
  const [processandoDoseId, setProcessandoDoseId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const historicoDosesCompleto = useLiveQuery(() => db.doseLogs.toArray(), []) || [];
  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const doses = useMemo<DoseItemExt[]>(() => {
    const list: DoseItemExt[] = [];
    for (const med of medicamentos || []) {
      if (!med.id || med.status === "descontinuado" || !med.estoque_horarios || med.estoque_horarios.length === 0) continue;

      const estoqueInfo = computeEstoqueInfo(med);
      const medicoObj = medicos.find((m) => m.id === med.medico_id);
      const tratamentoObj = tratamentos.find((t) => t.id === (med.tratamento_ids || [])[0]);
      const farmaciaObj = farmacias.find((f) => f.id === med.farmacia_id);
      const estabelecimentoObj = hospitais.find((h) => h.id === med.local_id);

      const insight = sugerirRenovacao(med);
      const receitaVencida = isReceitaVencidaSegura(med.proxima_renovacao);
      const comportamento = analisarComportamentoUso(med, historicoDosesCompleto.filter((d) => d.medicamento_id === med.id));

      for (const horario of med.estoque_horarios) {
        if (!horario) continue;
        const log = (doseLogs || []).find((l) => l.medicamento_id === med.id && l.horario === horario);
        const tomada = !!log?.tomado_em;
        const ignorada = !!log?.ignorado_em;

        list.push({
          medicamentoId: med.id,
          medicamentoNome: med.nome,
          dosagem: med.dosagem,
          horario,
          tomada,
          ignorada,
          cor: tratamentoObj?.cor || med.cor_principal || "#8B5CF6",
          estoqueRestante: estoqueInfo?.quantidadeRestante ?? 0,
          estoqueTotal: med.estoque_quantidade || 0,
          unidadeMedida: med.estoque_unidade_medida || "unidades",
          unidadePorDose: med.estoque_unidade_por_dose || 1,
          medicoNome: medicoObj?.nome || med.medico,
          medicoId: medicoObj?.id,
          tratamentoNome: tratamentoObj?.nome,
          tratamentoId: tratamentoObj?.id,
          tratamentoCor: tratamentoObj?.cor,
          farmaciaNome: farmaciaObj?.nome,
          farmaciaId: farmaciaObj?.id,
          estabelecimentoNome: estabelecimentoObj?.nome,
          estabelecimentoId: estabelecimentoObj?.id,
          proximaRenovacao: med.proxima_renovacao,
          diasRestantes: getDaysUntil(med.proxima_renovacao),
          insight,
          receitaVencida,
          comportamento,
        });
      }
    }
    return list.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [medicamentos, doseLogs, medicos, tratamentos, farmacias, hospitais, historicoDosesCompleto]);

  const compromissosFiltrados = useMemo(() => {
    let items: any[] = [];
    if (filtroCompromisso === "todos" || filtroCompromisso === "consultas") {
      items = [...items, ...consultasHoje.map(c => ({ ...c, tipo: "consulta" }))];
    }
    if (filtroCompromisso === "todos" || filtroCompromisso === "cirurgias") {
      items = [...items, ...cirurgiasHoje.map(c => ({ ...c, tipo: "cirurgia" }))];
    }
    if (filtroCompromisso === "todos" || filtroCompromisso === "exames") {
      items = [...items, ...examesHoje.map(e => ({ ...e, tipo: "exame" }))];
    }
    return items;
  }, [consultasHoje, cirurgiasHoje, examesHoje, filtroCompromisso]);

  const assistenteDiario = useMemo(() => {
    return analisarRotinaDiaria(doses, compromissosFiltrados);
  }, [doses, compromissosFiltrados]);

  const dosesFiltradas = useMemo(() => {
    let result = doses;

    if (filtroStatus === "tomados") {
      result = result.filter((d) => d.tomada);
    } else if (filtroStatus === "pendentes") {
      result = result.filter((d) => !d.tomada && !d.ignorada);
    } else if (filtroStatus === "ignorados") {
      result = result.filter((d) => d.ignorada);
    }

    if (filtroPeriodo !== "todos") {
      result = result.filter((d) => getPeriodoDoDia(d.horario).key === filtroPeriodo);
    }

    return result;
  }, [doses, filtroStatus, filtroPeriodo]);

  const dosesAgrupadas = useMemo(() => {
    const grupos: Record<string, { label: string; sub: string; items: DoseItemExt[] }> = {
      manha: { label: "Manhã", sub: "Início do dia", items: [] },
      tarde: { label: "Tarde", sub: "Período da tarde", items: [] },
      noite: { label: "Noite", sub: "Final do dia", items: [] },
    };

    dosesFiltradas.forEach((d) => {
      const p = getPeriodoDoDia(d.horario);
      if (grupos[p.key]) {
        grupos[p.key].items.push(d);
      }
    });

    return Object.entries(grupos).filter(([_, g]) => g.items.length > 0);
  }, [dosesFiltradas]);

  const totalTomadas = doses.filter((d) => d.tomada).length;
  const totalPendentes = doses.filter((d) => !d.tomada && !d.ignorada).length;

  const isLoading = medicamentos === undefined || doseLogs === undefined;
  if (isLoading) return <CardListSkeleton />;

  const handleToggle = async (item: DoseItemExt) => {
    if (processandoDoseId) return;

    const chaveDose = `${item.medicamentoId}-${item.horario}`;
    setProcessandoDoseId(chaveDose);

    const proximaTomada = !item.tomada;
    trigger(proximaTomada ? "success" : "vibrate");

    try {
      await marcarDose(item.medicamentoId, hoje, item.horario);

      const medOriginal = medicamentos?.find((m) => m.id === item.medicamentoId);
      if (medOriginal && typeof medOriginal.estoque_quantidade === "number") {
        const delta = proximaTomada ? -item.unidadePorDose : item.unidadePorDose;
        const novoEstoque = Math.max(0, (medOriginal.estoque_quantidade || 0) + delta);

        await safeUpdateMedicamento(item.medicamentoId, {
          estoque_quantidade: novoEstoque,
          estoque_data_referencia: hoje,
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

  const handleIgnorar = async (item: DoseItemExt) => {
    if (processandoDoseId) return;

    const chaveDose = `${item.medicamentoId}-${item.horario}`;
    setProcessandoDoseId(chaveDose);
    trigger("vibrate");

    try {
      await marcarComoIgnorada(item.medicamentoId, hoje, item.horario);
      showToast("Dose ignorada", "info");
    } catch (e) {
      console.error("Erro ao ignorar dose:", e);
      showToast("Erro ao ignorar dose", "error");
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
        observacoes: observacoesRenovacao || "Renovação rápida via alerta",
      });

      const estoqueAtual = medicamentoSelecionado.estoque_quantidade || 0;
      await safeUpdateMedicamento(medicamentoSelecionado.id, {
        estoque_quantidade: estoqueAtual + Number(adicionarMaisEstoque),
        estoque_data_referencia: hoje,
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

  const hasFiltrosAtivos = filtroStatus !== "todos" || filtroPeriodo !== "todos" || filtroCompromisso !== "todos";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-ice" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Linha do Tempo
                </p>
              </div>
              <h1 className="mt-0.5 font-display text-xl font-semibold text-ink-primary">
                Hoje
              </h1>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-ice bg-ice/10 px-3 py-1.5 rounded-full border border-ice/20">
                {totalTomadas} / {doses.length} tomadas
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-ink-muted shrink-0" />

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "pendentes" ? "todos" : "pendentes"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "pendentes" ? "border-coral bg-coral/20 text-coral" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Pendentes ({totalPendentes})
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "tomados" ? "todos" : "tomados"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "tomados" ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Tomados
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "ignorados" ? "todos" : "ignorados"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${
                filtroStatus === "ignorados" ? "border-ink-muted bg-surface-raised text-ink-muted" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              Ignorados
            </button>

            <div className="w-px h-5 bg-surface-border/40 mx-1" />

            <button onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "manha" ? "todos" : "manha"); }} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${filtroPeriodo === "manha" ? "border-ice bg-ice/20 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"}`}>Manhã</button>
            <button onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "tarde" ? "todos" : "tarde"); }} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${filtroPeriodo === "tarde" ? "border-ice bg-ice/20 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"}`}>Tarde</button>
            <button onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "noite" ? "todos" : "noite"); }} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${filtroPeriodo === "noite" ? "border-ice bg-ice/20 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"}`}>Noite</button>

            <div className="w-px h-5 bg-surface-border/40 mx-1" />

            {(consultasHoje.length > 0 || cirurgiasHoje.length > 0 || examesHoje.length > 0) && (
              <>
                <button onClick={() => { trigger("vibrate"); setFiltroCompromisso(filtroCompromisso === "consultas" ? "todos" : "consultas"); }} disabled={consultasHoje.length === 0} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${filtroCompromisso === "consultas" ? "border-ice bg-ice/20 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"} ${consultasHoje.length === 0 ? "opacity-40 pointer-events-none" : ""}`}>
                  Consultas ({consultasHoje.length})
                </button>
                <button onClick={() => { trigger("vibrate"); setFiltroCompromisso(filtroCompromisso === "cirurgias" ? "todos" : "cirurgias"); }} disabled={cirurgiasHoje.length === 0} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${filtroCompromisso === "cirurgias" ? "border-coral bg-coral/20 text-coral" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"} ${cirurgiasHoje.length === 0 ? "opacity-40 pointer-events-none" : ""}`}>
                  Cirurgias ({cirurgiasHoje.length})
                </button>
                <button onClick={() => { trigger("vibrate"); setFiltroCompromisso(filtroCompromisso === "exames" ? "todos" : "exames"); }} disabled={examesHoje.length === 0} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${filtroCompromisso === "exames" ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"} ${examesHoje.length === 0 ? "opacity-40 pointer-events-none" : ""}`}>
                  Exames ({examesHoje.length})
                </button>
              </>
            )}

            {hasFiltrosAtivos && (
              <button onClick={() => { trigger("vibrate"); setFiltroStatus("todos"); setFiltroPeriodo("todos"); setFiltroCompromisso("todos"); }} className="text-[10px] font-medium text-coral bg-coral/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                <X size={12} /> Limpar
              </button>
            )}
          </div>
        </header>

        <section className="space-y-6 px-5 pt-6">
          {assistenteDiario && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 rounded-[24px] border p-4 shadow-sm ${
                assistenteDiario.urgencia === 'alta' ? 'bg-coral/5 border-coral/30' :
                assistenteDiario.urgencia === 'media' ? 'bg-amber-400/5 border-amber-400/30' :
                'bg-ice/5 border-ice/30'
              }`}
            >
              <div className={`flex shrink-0 h-10 w-10 items-center justify-center rounded-xl ${
                assistenteDiario.urgencia === 'alta' ? 'bg-coral/20 text-coral' :
                assistenteDiario.urgencia === 'media' ? 'bg-amber-400/20 text-amber-400' :
                'bg-ice/20 text-ice'
              }`}>
                {assistenteDiario.icone === 'cirurgia' && <Activity size={20} />}
                {assistenteDiario.icone === 'alerta' && <AlertTriangle size={20} />}
                {assistenteDiario.icone === 'medico' && <Stethoscope size={20} />}
                {assistenteDiario.icone === 'info' && <Info size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-bold ${
                  assistenteDiario.urgencia === 'alta' ? 'text-coral' :
                  assistenteDiario.urgencia === 'media' ? 'text-amber-400' :
                  'text-ice'
                }`}>{assistenteDiario.titulo}</h3>
                <p className="text-xs text-ink-primary mt-1 leading-snug">{assistenteDiario.mensagem}</p>
              </div>
            </motion.div>
          )}

          {compromissosFiltrados.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Calendar size={16} className="text-coral" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                  Compromissos de Hoje
                </h2>
              </div>
              <div className="space-y-2.5">
                {compromissosFiltrados.map((item: any) => {
                  if (item.tipo === "consulta") {
                    return (
                      <div key={item.id} onClick={() => { trigger("vibrate"); router.push(`/saude/consultas/detalhes?id=${item.id}`); }} className="flex items-center justify-between rounded-[24px] border border-ice/30 bg-ice/5 p-4 cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice/20 text-ice">
                            <Stethoscope size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink-primary">Consulta agendada</p>
                            <p className="text-xs text-ink-muted">{item.especialidade} • Dr(a). {item.medico}</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-ice font-bold bg-ice/10 px-2.5 py-1 rounded-full">Hoje</span>
                      </div>
                    );
                  } else if (item.tipo === "cirurgia") {
                    return (
                      <div key={item.id} onClick={() => { trigger("vibrate"); router.push(`/saude/cirurgias/detalhes?id=${item.id}`); }} className="flex items-center justify-between rounded-[24px] border border-coral/30 bg-coral/5 p-4 cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/20 text-coral">
                            <Activity size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink-primary">Procedimento Cirúrgico</p>
                            <p className="text-xs text-ink-muted">{item.procedimento}</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-coral font-bold bg-coral/10 px-2.5 py-1 rounded-full">Hoje</span>
                      </div>
                    );
                  } else if (item.tipo === "exame") {
                    return (
                      <div key={item.id} onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${item.id}`); }} className="flex items-center justify-between rounded-[24px] border border-emerald-400/30 bg-emerald-400/5 p-4 cursor-pointer active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-400">
                            <FlaskConical size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-ink-primary">Realização de Exame</p>
                            <p className="text-xs text-ink-muted">{item.nome}</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-400/10 px-2.5 py-1 rounded-full">Hoje</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {dosesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-surface-border/50 bg-surface px-6 py-14 text-center shadow-sm">
              <Pill size={22} className="text-ice/60 mb-4" />
              <h3 className="font-display text-base font-semibold text-ink-primary">Nada programado para hoje</h3>
              <p className="text-sm text-ink-muted mt-2">
                {hasFiltrosAtivos ? "Nenhum item encontrado com os filtros aplicados." : "Cadastre horários nos medicamentos para gerenciar sua rotina aqui."}
              </p>
            </div>
          ) : (
            dosesAgrupadas.map(([key, grupo]) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">{grupo.label}</h2>
                    <p className="text-[11px] text-ink-muted">{grupo.sub}</p>
                  </div>
                  <span className="text-[10px] font-mono text-ink-faint">
                    {grupo.items.filter((i) => i.tomada).length}/{grupo.items.length} concluídos
                  </span>
                </div>
                <div className="space-y-2.5">
                  {grupo.items.map((item) => {
                    const isAtrasado = !item.tomada && !item.ignorada && item.horario < horaAtual;
                    const isProximo = !item.tomada && !item.ignorada && item.horario >= horaAtual;
                    const isEstoqueCritico = item.estoqueRestante <= 3 && item.estoqueRestante > 0;
                    const isEstoqueZerado = item.estoqueRestante <= 0;
                    const tratamentoCor = item.tratamentoCor || item.cor || "#8B5CF6";
                    const isProcessando = processandoDoseId === `${item.medicamentoId}-${item.horario}`;

                    const diasEstilo = getDiasRestantesEstilo(item.diasRestantes);

                    let statusBadge = null;
                    if (item.tomada) {
                      statusBadge = <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 text-emerald-400 px-3 py-1 text-xs font-mono font-bold"><CheckCircle2 size={12} /> Tomada</span>;
                    } else if (item.ignorada) {
                      statusBadge = <span className="flex items-center gap-1 rounded-full bg-ink-muted/15 text-ink-muted px-3 py-1 text-xs font-mono font-bold"><XCircle size={12} /> Ignorada</span>;
                    } else if (isAtrasado) {
                      statusBadge = <span className="flex items-center gap-1 rounded-full bg-coral/15 text-coral px-3 py-1 text-xs font-mono font-bold animate-pulse border border-coral/30"><AlertTriangle size={12} /> Atrasado</span>;
                    } else if (isProximo) {
                      statusBadge = <span className="flex items-center gap-1 rounded-full bg-amber-400/15 text-amber-400 px-3 py-1 text-xs font-mono font-bold"><Clock size={12} /> Próximo</span>;
                    } else {
                      statusBadge = <span className="flex items-center gap-1 rounded-full bg-ice/10 text-ice px-3 py-1 text-xs font-mono font-bold border border-ice/20"><Clock size={12} /> {item.horario}</span>;
                    }

                    return (
                      <div
                        key={`${item.medicamentoId}-${item.horario}`}
                        style={{ borderLeft: `6px solid ${tratamentoCor}` }}
                        className={`group relative flex w-full flex-col gap-2 rounded-[24px] border p-4 text-left shadow-sm transition-all active:scale-[0.985] ${
                          item.tomada ? "border-emerald-400/30 bg-emerald-400/5 opacity-75" : item.ignorada ? "border-ink-muted/20 bg-surface-raised/50 opacity-60" : isAtrasado ? "border-coral/50 bg-coral/5" : "border-surface-border/50 bg-surface"
                        } ${isProcessando ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {item.tomada ? <CheckCircle2 size={24} className="text-emerald-400 shrink-0" /> : item.ignorada ? <XCircle size={24} className="text-ink-muted shrink-0" /> : <Circle size={24} className="text-ink-faint shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`truncate text-sm font-semibold ${item.tomada || item.ignorada ? "text-ink-muted line-through" : "text-ink-primary"}`}>{item.medicamentoNome}</p>
                                <span className="text-xs font-medium text-ink-muted">{item.dosagem}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                {item.tratamentoNome && item.tratamentoId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      trigger("vibrate");
                                      router.push(`/saude/tratamentos/detalhes?id=${item.tratamentoId}`);
                                    }}
                                    className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md transition-colors hover:opacity-80"
                                    style={{
                                      backgroundColor: tratamentoCor ? `${tratamentoCor}20` : "#8B5CF620",
                                      color: tratamentoCor || "#8B5CF6",
                                    }}
                                  >
                                    {item.tratamentoNome}
                                  </button>
                                )}
                                {item.medicoNome && <span className="text-[10px] text-ink-muted flex items-center gap-1"><Stethoscope size={10} /> Dr(a). {item.medicoNome}</span>}
                                {item.farmaciaNome && <span className="text-[10px] text-ink-muted flex items-center gap-1"><Building2 size={10} /> {item.farmaciaNome}</span>}
                                {item.estabelecimentoNome && <span className="text-[10px] text-ink-muted flex items-center gap-1"><MapPin size={10} /> {item.estabelecimentoNome}</span>}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
                                {item.estoqueRestante >= 0 && <span className="text-ink-muted">Estoque: {item.estoqueRestante} {item.unidadeMedida}</span>}
                                {item.diasRestantes !== undefined && item.diasRestantes !== null && item.diasRestantes >= 0 && (
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono font-bold ${diasEstilo.cor} ${diasEstilo.bg} ${diasEstilo.pulse ? "animate-pulse" : ""}`}>
                                    <Calendar size={12} />
                                    {item.diasRestantes} dias {diasEstilo.label !== "Indefinido" && `· ${diasEstilo.label}`}
                                  </span>
                                )}
                                {item.insight?.deveRenovar && <span className="flex items-center gap-1 text-amber-400 font-semibold"><FileWarning size={12} /> Renovar</span>}
                                {item.receitaVencida && <span className="flex items-center gap-1 text-coral font-semibold"><AlertOctagon size={12} /> Receita vencida</span>}
                              </div>
                              {isEstoqueZerado && <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-coral animate-pulse"><AlertTriangle size={14} /> Estoque zerado! Renove agora.</div>}
                              {isEstoqueCritico && <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-400"><AlertTriangle size={12} /> Estoque crítico ({item.estoqueRestante} {item.unidadeMedida})</div>}
                              {item.comportamento && <div className="mt-1.5 flex items-center gap-1 text-[10px] text-violet-400 bg-violet-400/10 px-2 py-1 rounded-full w-fit"><TrendingUp size={12} /> {item.comportamento.titulo}</div>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {statusBadge}
                            <div className="flex items-center gap-1.5">
                              {!item.tomada && !item.ignorada && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleIgnorar(item); }} disabled={isProcessando || isProcessing} className="text-[10px] font-medium text-ink-muted bg-surface-raised px-2 py-1 rounded-full border border-surface-border/50 hover:bg-ink-muted/10 active:scale-95 transition-all disabled:opacity-50">Ignorar</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleToggle(item); }} disabled={isProcessando || isProcessing} className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full hover:bg-emerald-400/20 active:scale-95 transition-all disabled:opacity-50">{isProcessando ? "..." : "Tomar"}</button>
                                </>
                              )}
                              {item.tomada && <button onClick={(e) => { e.stopPropagation(); handleToggle(item); }} className="text-[10px] font-medium text-ink-muted bg-surface-raised px-2 py-1 rounded-full border border-surface-border/50 hover:bg-ink-muted/10 active:scale-95 transition-all">Desfazer</button>}
                            </div>
                          </div>
                        </div>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md" onClick={() => { trigger("vibrate"); setModalAberto(false); }}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[32px] border border-surface-border bg-surface p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/20 text-coral"><AlertTriangle size={20} /></div>
                    <div><h3 className="font-display text-base font-bold text-ink-primary">Estoque Baixo!</h3><p className="text-xs text-ink-muted">{medicamentoSelecionado.nome}</p></div>
                  </div>
                  <button onClick={() => { trigger("vibrate"); setModalAberto(false); }} className="text-ink-muted hover:text-ink-primary"><X size={18} /></button>
                </div>
                <p className="text-xs text-ink-muted">Deseja registrar a renovação e repor o estoque no sistema?</p>
                <div className="space-y-3">
                  <div><label className="text-[11px] text-ink-muted block mb-1">Unidades a adicionar</label><input type="number" value={adicionarMaisEstoque} onChange={(e) => setAdicionarMaisEstoque(Number(e.target.value))} className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-ice" /></div>
                  <div><label className="text-[11px] text-ink-muted block mb-1">Preço pago (R$) — Opcional</label><div className="relative"><DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" /><input type="text" placeholder="0,00" value={precoRenovacao} onChange={(e) => setPrecoRenovacao(e.target.value)} className="w-full rounded-2xl border border-surface-border bg-surface-raised pl-10 pr-4 py-3 text-sm text-ink-primary font-mono outline-none focus:border-ice" /></div></div>
                  <div><label className="text-[11px] text-ink-muted block mb-1">Observações</label><input type="text" placeholder="Ex: Farmácia X / SUS" value={observacoesRenovacao} onChange={(e) => setObservacoesRenovacao(e.target.value)} className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-ice" /></div>
                </div>
                <div className="flex items-center gap-2 pt-2"><button onClick={() => { trigger("vibrate"); setModalAberto(false); }} className="flex-1 rounded-2xl border border-surface-border bg-surface-raised py-3 text-xs font-semibold text-ink-muted active:scale-95 transition-all">Depois</button><button onClick={handleSalvarRenovacaoDoModal} disabled={isProcessing} className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-semibold text-void shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? "Salvando..." : "Repor e Renovar"}</button></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
