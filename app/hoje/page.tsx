// app/hoje/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Plus,
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useLiveQuery } from "dexie-react-hooks";
import { db, safeAddRenovacao, safeUpdateMedicamento } from "@/lib/db";
import { enfileirarOperacao } from "@/lib/sync/enfileirarOperacao";
import { EmptyState } from "@/components/EmptyState";
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
import { QuickDoseModal } from "@/components/saude/QuickDoseModal";

type FiltroStatus = "todos" | "tomados" | "pendentes" | "ignorados";
type FiltroPeriodo = "todos" | "manha" | "tarde" | "noite";
type FiltroCompromisso = "todos" | "consultas" | "cirurgias" | "exames";

function getPeriodoDoDia(horario: string) {
  const safeHorario = horario || "00:00";
  const [h] = safeHorario.split(":").map(Number);
  if (h >= 5 && h < 12) return { key: "manha", label: "🌅 Manhã", sub: "Comece o dia com foco" };
  if (h >= 12 && h < 18) return { key: "tarde", label: "☀️ Tarde", sub: "Manutenção e constância" };
  return { key: "noite", label: "🌙 Noite", sub: "Encerramento e descanso" };
}

function getDiasRestantesEstilo(dias: number | null | undefined) {
  if (dias === null || dias === undefined) return { cor: "text-ink-muted", bg: "bg-surface", label: "Indefinido", pulse: false };
  if (dias <= 3) return { cor: "text-coral", bg: "bg-coral/10", label: "Urgente", pulse: true };
  if (dias <= 7) return { cor: "text-amber-400", bg: "bg-amber-400/10", label: "Em breve", pulse: false };
  if (dias <= 14) return { cor: "text-amber-300", bg: "bg-amber-300/5", label: "Atenção", pulse: false };
  return { cor: "text-emerald-400", bg: "bg-emerald-400/10", label: "Tranquilo", pulse: false };
}

interface DoseItemExt {
  medicamentoId?: string;
  medicamentoNome?: string;
  dosagem?: string;
  horario: string;
  tomada: boolean;
  ignorada: boolean;
  cor: string;
  estoqueRestante?: number;
  estoqueTotal?: number;
  unidadeMedida?: string;
  unidadePorDose?: number;
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
  isAvulsa?: boolean;
  motivoAvulsa?: string;
  logId?: string;
  // Propriedades para Sintomas
  isSintoma?: boolean;
  sintomaId?: string;
  sintomaNome?: string;
  sintomaTipo?: string;
  intensidade?: number;
  observacoesSintoma?: string;
}

export default function HojePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trigger } = useHapticFeedback();
  const { showToast } = useToast();
  const hoje = getLocalTodayISO();
  const { activePersonId } = useActivePersonId();

  const { medicamentos: rawMedicamentos } = useMedicamentos();
  const medicamentos = useMemo(() => {
    if (!rawMedicamentos) return [];
    return rawMedicamentos.filter((m: any) => !activePersonId || !m.person_id || m.person_id === activePersonId);
  }, [rawMedicamentos, activePersonId]);

  const { doseLogs, marcarComoTomada: marcarDose, marcarComoIgnorada } = useDoseLogs(hoje);

  const tratamentos = useLiveQuery(
    () => activePersonId ? db.tratamentos.where('person_id').equals(activePersonId).toArray() : db.tratamentos.toArray(),
    [activePersonId]
  ) || [];
  const medicos = useLiveQuery(() => db.medicos.toArray(), []) || [];
  const farmacias = useLiveQuery(() => db.farmacias.toArray(), []) || [];
  const hospitais = useLiveQuery(() => db.hospitais.toArray(), []) || [];

  const rawConsultas = useLiveQuery(() => db.consultas.toArray(), []) || [];
  const consultas = useMemo(() => rawConsultas.filter((c: any) => !activePersonId || !c.person_id || c.person_id === activePersonId), [rawConsultas, activePersonId]);

  const rawCirurgias = useLiveQuery(() => db.cirurgias.toArray(), []) || [];
  const cirurgias = useMemo(() => rawCirurgias.filter((c: any) => !activePersonId || !c.person_id || c.person_id === activePersonId), [rawCirurgias, activePersonId]);

  const rawExames = useLiveQuery(() => db.exames.toArray(), []) || [];
  const exames = useMemo(() => rawExames.filter((e: any) => !activePersonId || !e.person_id || e.person_id === activePersonId), [rawExames, activePersonId]);

  const rawRegistrosSaude = useLiveQuery(() => db.table('registros_saude').toArray(), []) || [];
  const registrosHoje = useMemo(() => {
    return rawRegistrosSaude.filter((r: any) => {
      const matchPerson = !activePersonId || !r.person_id || r.person_id === activePersonId;
      const matchDate = r.data === hoje;
      return matchPerson && matchDate;
    });
  }, [rawRegistrosSaude, activePersonId, hoje]);

  const consultasHoje = useMemo(() => consultas.filter((c: any) => c.data === hoje), [consultas, hoje]);
  const cirurgiasHoje = useMemo(() => cirurgias.filter((c: any) => c.data === hoje), [cirurgias, hoje]);
  const examesHoje = useMemo(() => exames.filter((e: any) => e.data === hoje), [exames, hoje]);

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

  // ESTADO DO MODAL UNIFICADO DE DOSE RÁPIDA
  const [isDoseModalOpen, setIsDoseModalOpen] = useState(false);

  // Escuta os parâmetros da URL para abrir os modais
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "dose") {
      setIsDoseModalOpen(true);
      router.replace("/hoje");
    } else if (action === "sintoma") {
      router.replace("/saude/registros/novo");
    }
  }, [searchParams, router]);

  const historicoDosesCompleto = useLiveQuery(() => db.doseLogs.toArray(), []) || [];
  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const doses = useMemo<DoseItemExt[]>(() => {
    const list: DoseItemExt[] = [];
    const chavesProgramadas = new Set<string>();

    // 1. Processa os medicamentos contínuos programados para hoje
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
        chavesProgramadas.add(`${med.id}-${horario}`);
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
          isAvulsa: false,
        });
      }
    }

    // 2. Processa as doses avulsas / manuais registradas para hoje (doseLogs)
    for (const log of (doseLogs || [])) {
      if (!log.medicamento_id) continue;
      const chave = `${log.medicamento_id}-${log.horario}`;
      const med = medicamentos.find(m => m.id === log.medicamento_id);
      if (!med) continue;

      if (!chavesProgramadas.has(chave) || log.tomado_em) {
        const jaExisteAvulsa = list.some(item => item.logId === log.id);
        if (!jaExisteAvulsa && log.tomado_em) {
          const tratamentoObj = tratamentos.find((t) => t.id === (med.tratamento_ids || [])[0]);
          const medicoObj = medicos.find((m) => m.id === med.medico_id);

          list.push({
            medicamentoId: med.id!,
            medicamentoNome: med.nome,
            dosagem: med.dosagem,
            horario: log.horario || "00:00",
            tomada: true,
            ignorada: false,
            cor: tratamentoObj?.cor || med.cor_principal || "#8B5CF6",
            estoqueRestante: med.estoque_quantidade ?? 0,
            estoqueTotal: med.estoque_quantidade || 0,
            unidadeMedida: med.estoque_unidade_medida || "unidades",
            unidadePorDose: log.quantidade || med.estoque_unidade_por_dose || 1,
            medicoNome: medicoObj?.nome || med.medico,
            tratamentoNome: tratamentoObj?.nome,
            tratamentoId: tratamentoObj?.id,
            tratamentoCor: tratamentoObj?.cor,
            isAvulsa: true,
            motivoAvulsa: (log as any).observacoes || "Dose avulsa / SOS",
            logId: log.id,
          });
        }
      }
    }

    // 3. Processa os registros de sintomas para hoje
    for (const reg of registrosHoje) {
      if (reg.categoria === 'sintoma') {
        list.push({
          horario: reg.horario || "00:00",
          tomada: true,
          ignorada: false,
          cor: "#F59E0B",
          isSintoma: true,
          sintomaId: reg.id,
          sintomaNome: reg.nome || reg.tipo || "Sintoma registrado",
          sintomaTipo: reg.tipo,
          intensidade: reg.intensidade,
          observacoesSintoma: reg.observacoes,
        });
      }
    }

    return list.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [medicamentos, doseLogs, medicos, tratamentos, farmacias, hospitais, historicoDosesCompleto, registrosHoje]);

  const compromissosFiltrados = useMemo(() => {
    let items: any[] = [];
    if (filtroCompromisso === "todos" || filtroCompromisso === "consultas") items = [...items, ...consultasHoje.map(c => ({ ...c, tipo: "consulta" }))];
    if (filtroCompromisso === "todos" || filtroCompromisso === "cirurgias") items = [...items, ...cirurgiasHoje.map(c => ({ ...c, tipo: "cirurgia" }))];
    if (filtroCompromisso === "todos" || filtroCompromisso === "exames") items = [...items, ...examesHoje.map(e => ({ ...e, tipo: "exame" }))];
    return items;
  }, [consultasHoje, cirurgiasHoje, examesHoje, filtroCompromisso]);

  const assistenteDiario = useMemo(() => analisarRotinaDiaria(doses, compromissosFiltrados), [doses, compromissosFiltrados]);

  const dosesFiltradas = useMemo(() => {
    let result = doses;
    if (filtroStatus === "tomados") result = result.filter((d) => d.tomada);
    else if (filtroStatus === "pendentes") result = result.filter((d) => !d.tomada && !d.ignorada && !d.isSintoma);
    else if (filtroStatus === "ignorados") result = result.filter((d) => d.ignorada);

    if (filtroPeriodo !== "todos") result = result.filter((d) => getPeriodoDoDia(d.horario).key === filtroPeriodo);
    return result;
  }, [doses, filtroStatus, filtroPeriodo]);

  const dosesAgrupadas = useMemo(() => {
    const grupos: Record<string, { label: string; sub: string; items: DoseItemExt[] }> = {
      manha: { label: "🌅 Manhã", sub: "Início do dia", items: [] },
      tarde: { label: "☀️ Tarde", sub: "Período da tarde", items: [] },
      noite: { label: "🌙 Noite", sub: "Final do dia", items: [] },
    };
    dosesFiltradas.forEach((d) => {
      const p = getPeriodoDoDia(d.horario);
      if (grupos[p.key]) grupos[p.key].items.push(d);
    });
    return Object.entries(grupos).filter(([_, g]) => g.items.length > 0);
  }, [dosesFiltradas]);

  const totalTomadas = doses.filter((d) => d.tomada).length;
  const totalPendentes = doses.filter((d) => !d.tomada && !d.ignorada && !d.isSintoma).length;

  const isLoading = rawMedicamentos === undefined || doseLogs === undefined;
  if (isLoading) return <CardListSkeleton />;

  const handleToggle = async (item: DoseItemExt) => {
    if (processandoDoseId) return;
    const chaveDose = item.logId ? `log-${item.logId}` : `${item.medicamentoId}-${item.horario}`;
    setProcessandoDoseId(chaveDose);

    const proximaTomada = !item.tomada;
    trigger(proximaTomada ? "success" : "vibrate");

    try {
      if (item.isAvulsa && item.logId) {
        if (!proximaTomada) {
          await db.doseLogs.delete(item.logId);
          await enfileirarOperacao("doseLogs", "delete", { id: item.logId });
        }
      } else {
        await marcarDose(item.medicamentoId!, hoje, item.horario);
        const medOriginal = medicamentos?.find((m) => m.id === item.medicamentoId);
        if (medOriginal && typeof medOriginal.estoque_quantidade === "number") {
          const delta = proximaTomada ? -(item.unidadePorDose || 1) : (item.unidadePorDose || 1);
          const novoEstoque = Math.max(0, (medOriginal.estoque_quantidade || 0) + delta);

          await safeUpdateMedicamento(item.medicamentoId!, {
            estoque_quantidade: novoEstoque,
            estoque_data_referencia: hoje,
          });

          if (proximaTomada && novoEstoque <= 3) {
            setMedicamentoSelecionado(medOriginal);
            setModalAberto(true);
          }
        }
      }
    } catch (e) {
      showToast("Erro ao atualizar dose", "error");
    } finally {
      setProcessandoDoseId(null);
    }
  };

  const handleIgnorar = async (item: DoseItemExt) => {
    if (processandoDoseId || !item.medicamentoId) return;
    setProcessandoDoseId(`${item.medicamentoId}-${item.horario}`);
    trigger("vibrate");
    try {
      await marcarComoIgnorada(item.medicamentoId, hoje, item.horario);
      showToast("Dose ignorada", "info");
    } catch (e) {
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
      showToast("Erro ao renovar", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasFiltrosAtivos = filtroStatus !== "todos" || filtroPeriodo !== "todos" || filtroCompromisso !== "todos";

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-safe backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-ice" />
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ice/90">
                  Linha do Tempo
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Hoje
              </h1>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-ice bg-ice/10 px-3 py-1.5 rounded-full border border-ice/20">
                {totalTomadas} registros hoje
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Filter size={14} className="text-ink-muted shrink-0" />

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "pendentes" ? "todos" : "pendentes"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                filtroStatus === "pendentes" ? "border-coral bg-coral/20 text-coral" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              <AlertTriangle size={12} /> Pendentes ({totalPendentes})
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "tomados" ? "todos" : "tomados"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                filtroStatus === "tomados" ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              <CheckCircle2 size={12} /> Concluídos
            </button>

            <button
              onClick={() => { trigger("vibrate"); setFiltroStatus(filtroStatus === "ignorados" ? "todos" : "ignorados"); }}
              className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                filtroStatus === "ignorados" ? "border-ink-muted bg-surface-raised text-ink-muted" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
              }`}
            >
              <XCircle size={12} /> Ignorados
            </button>

            <div className="w-px h-5 bg-surface-border/40 mx-1" />

            <button onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "manha" ? "todos" : "manha"); }} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${filtroPeriodo === "manha" ? "border-ice bg-ice/20 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"}`}>🌅 Manhã</button>
            <button onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "tarde" ? "todos" : "tarde"); }} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${filtroPeriodo === "tarde" ? "border-ice bg-ice/20 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"}`}>☀️ Tarde</button>
            <button onClick={() => { trigger("vibrate"); setFiltroPeriodo(filtroPeriodo === "noite" ? "todos" : "noite"); }} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${filtroPeriodo === "noite" ? "border-ice bg-ice/20 text-ice" : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"}`}>🌙 Noite</button>

            {hasFiltrosAtivos && (
              <button onClick={() => { trigger("vibrate"); setFiltroStatus("todos"); setFiltroPeriodo("todos"); setFiltroCompromisso("todos"); }} className="text-[10px] font-medium text-coral bg-coral/10 px-3 py-1.5 rounded-full flex items-center gap-1 ml-auto">
                <X size={12} /> Limpar filtros
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
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${
                    assistenteDiario.urgencia === 'alta' ? 'text-coral' :
                    assistenteDiario.urgencia === 'media' ? 'text-amber-400' :
                    'text-ice'
                  }`}>{assistenteDiario.titulo}</h3>
                  <span className="text-xs text-ink-faint">💡 Dica</span>
                </div>
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
                  const getIcon = () => {
                    if (item.tipo === "consulta") return <Stethoscope size={18} className="text-ice" />;
                    if (item.tipo === "cirurgia") return <Activity size={18} className="text-coral" />;
                    return <FlaskConical size={18} className="text-emerald-400" />;
                  };
                  const getColor = () => {
                    if (item.tipo === "consulta") return "border-ice/30 bg-ice/5";
                    if (item.tipo === "cirurgia") return "border-coral/30 bg-coral/5";
                    return "border-emerald-400/30 bg-emerald-400/5";
                  };
                  return (
                    <div key={item.id} onClick={() => { trigger("vibrate"); router.push(`/saude/${item.tipo}s/detalhes?id=${item.id}`); }} className={`flex items-center justify-between rounded-[24px] border ${getColor()} p-4 cursor-pointer active:scale-[0.98] transition-all`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-raised">
                          {getIcon()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">{item.tipo === "consulta" ? "Consulta agendada" : item.tipo === "cirurgia" ? "Procedimento Cirúrgico" : "Realização de Exame"}</p>
                          <p className="text-xs text-ink-muted">{item.especialidade || item.procedimento || item.nome}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.horario && <span className="text-[10px] font-mono text-ink-faint">{item.horario}</span>}
                        <span className={`text-[10px] font-bold ${
                          item.tipo === "consulta" ? "text-ice" :
                          item.tipo === "cirurgia" ? "text-coral" : "text-emerald-400"
                        } bg-current/10 px-2.5 py-1 rounded-full`}>Hoje</span>
                        <span className="text-[10px] font-medium text-ice bg-ice/10 px-2 py-1 rounded-full">Ver</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dosesFiltradas.length === 0 ? (
            <EmptyState
              icon={Pill}
              title={hasFiltrosAtivos ? "Nada com esses filtros" : "Nenhum registro hoje"}
              description={hasFiltrosAtivos ? "Tente ajustar os filtros para ver mais itens." : "Registre uma dose avulsa ou adicione um sintoma para ver sua linha do tempo preenchida."}
              actionLabel={!hasFiltrosAtivos ? "Registrar Dose Avulsa" : undefined}
              onAction={!hasFiltrosAtivos ? () => { trigger("vibrate"); setIsDoseModalOpen(true); } : undefined}
              iconClassName="bg-ice/10 border-ice/20 text-ice"
            />
          ) : (
            dosesAgrupadas.map(([key, grupo]) => {
              const total = grupo.items.length;
              const concluidos = grupo.items.filter((i) => i.tomada).length;
              const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">{grupo.label}</h2>
                      <p className="text-[11px] text-ink-muted">{grupo.sub}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 rounded-full bg-surface-border overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-ink-faint">{concluidos}/{total}</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {grupo.items.map((item) => {
                      if (item.isSintoma) {
                        return (
                          <div
                            key={`sintoma-${item.sintomaId}`}
                            style={{ borderLeft: `6px solid ${item.cor}` }}
                            onClick={() => { trigger("vibrate"); router.push(`/saude/registros/detalhes?id=${item.sintomaId}`); }}
                            className="group relative flex w-full flex-col gap-2 rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 text-left shadow-sm cursor-pointer active:scale-[0.985] transition-all hover:border-amber-400/60"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 shadow-inner">
                                  <Activity size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                                      ⚠️ Sintoma Registrado
                                    </span>
                                    <span className="text-[10px] text-ink-faint">•</span>
                                    <span className="text-[10px] font-mono text-ink-faint">{item.horario}</span>
                                  </div>
                                  <p className="truncate text-sm font-semibold text-ink-primary">{item.sintomaNome}</p>
                                  {item.intensidade && (
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="text-[10px] font-medium text-ink-muted">Intensidade:</span>
                                      <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((lvl) => (
                                          <div
                                            key={lvl}
                                            className={`h-1.5 w-3.5 rounded-full ${
                                              lvl <= (item.intensidade || 1) ? "bg-amber-400" : "bg-surface-border"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-[10px] font-mono text-amber-400 font-bold">{item.intensidade}/5</span>
                                    </div>
                                  )}
                                  {item.observacoesSintoma && (
                                    <p className="text-xs text-ink-muted mt-1 italic line-clamp-2">
                                      "{item.observacoesSintoma}"
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full shrink-0">
                                Ver Detalhes
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const isAtrasado = !item.tomada && !item.ignorada && item.horario < horaAtual && !item.isAvulsa;
                      const isProximo = !item.tomada && !item.ignorada && item.horario >= horaAtual && !item.isAvulsa;
                      const isEstoqueCritico = (item.estoqueRestante ?? 0) <= 3 && (item.estoqueRestante ?? 0) > 0;
                      const isEstoqueZerado = (item.estoqueRestante ?? 0) <= 0;
                      const tratamentoCor = item.tratamentoCor || item.cor || "#8B5CF6";
                      const isProcessando = processandoDoseId === (item.logId ? `log-${item.logId}` : `${item.medicamentoId}-${item.horario}`);

                      const diasEstilo = getDiasRestantesEstilo(item.diasRestantes);

                      let statusIcon = null;
                      let statusText = "";
                      let statusColor = "";
                      if (item.tomada) {
                        statusIcon = <CheckCircle2 size={12} className="text-emerald-400" />;
                        statusText = item.isAvulsa ? "Tomada (Avulsa)" : "Tomada";
                        statusColor = "text-emerald-400";
                      } else if (item.ignorada) {
                        statusIcon = <XCircle size={12} className="text-ink-muted" />;
                        statusText = "Ignorada";
                        statusColor = "text-ink-muted";
                      } else if (isAtrasado) {
                        statusIcon = <AlertTriangle size={12} className="text-coral" />;
                        statusText = "Atrasado";
                        statusColor = "text-coral";
                      } else if (isProximo) {
                        statusIcon = <Clock size={12} className="text-amber-400" />;
                        statusText = "Próximo";
                        statusColor = "text-amber-400";
                      } else {
                        statusIcon = <Circle size={12} className="text-ink-faint" />;
                        statusText = item.horario;
                        statusColor = "text-ink-faint";
                      }

                      return (
                        <div
                          key={item.logId || `${item.medicamentoId}-${item.horario}`}
                          style={{ borderLeft: `6px solid ${tratamentoCor}` }}
                          className={`group relative flex w-full flex-col gap-2 rounded-[24px] border p-4 text-left shadow-sm transition-all active:scale-[0.985] ${
                            item.tomada ? "border-emerald-400/30 bg-emerald-400/5 opacity-85" : item.ignorada ? "border-ink-muted/20 bg-surface-raised/50 opacity-60" : isAtrasado ? "border-coral/50 bg-coral/5" : isProximo ? "border-amber-400/20 bg-amber-400/5" : "border-surface-border/50 bg-surface"
                          } ${isProcessando ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              {item.tomada ? <CheckCircle2 size={24} className="text-emerald-400 shrink-0" /> : item.ignorada ? <XCircle size={24} className="text-ink-muted shrink-0" /> : <Circle size={24} className="text-ink-faint shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-mono font-bold ${statusColor}`}>
                                      {statusIcon} {statusText}
                                    </span>
                                    <span className="text-[10px] text-ink-faint">•</span>
                                    <span className="text-[10px] font-mono text-ink-faint">{item.horario}</span>
                                    {item.isAvulsa && (
                                      <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase border border-amber-400/20">
                                        ⚡ SOS / Avulsa
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className={`truncate text-sm font-semibold ${item.ignorada ? "text-ink-muted line-through" : "text-ink-primary"}`}>{item.medicamentoNome}</p>
                                <p className="text-xs font-medium text-ink-muted">{item.dosagem}</p>
                                
                                {item.isAvulsa && item.motivoAvulsa && (
                                  <p className="text-xs text-amber-300 font-medium mt-1 bg-amber-400/10 px-2.5 py-1 rounded-lg w-fit border border-amber-400/20">
                                    Motivo: {item.motivoAvulsa}
                                  </p>
                                )}

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
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
                                  {!item.isAvulsa && (item.estoqueRestante ?? 0) >= 0 && <span className="text-ink-muted">Estoque: {item.estoqueRestante} {item.unidadeMedida}</span>}
                                  {!item.isAvulsa && item.diasRestantes !== undefined && item.diasRestantes !== null && item.diasRestantes >= 0 && (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono font-bold ${diasEstilo.cor} ${diasEstilo.bg} ${diasEstilo.pulse ? "animate-pulse" : ""}`}>
                                      <Calendar size={12} />
                                      {item.diasRestantes} dias {diasEstilo.label !== "Indefinido" && `· ${diasEstilo.label}`}
                                    </span>
                                  )}
                                  {!item.isAvulsa && item.insight?.deveRenovar && <span className="flex items-center gap-1 text-amber-400 font-semibold"><FileWarning size={12} /> Renovar</span>}
                                  {!item.isAvulsa && item.receitaVencida && <span className="flex items-center gap-1 text-coral font-semibold"><AlertOctagon size={12} /> Receita vencida</span>}
                                </div>
                                {!item.isAvulsa && isEstoqueZerado && (
                                  <div className="mt-1.5 flex items-center gap-2 text-[10px] font-bold text-coral animate-pulse">
                                    <AlertTriangle size={14} /> Estoque zerado!
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        trigger("vibrate");
                                        const med = medicamentos.find(m => m.id === item.medicamentoId);
                                        if (med) { setMedicamentoSelecionado(med); setModalAberto(true); }
                                      }}
                                      className="text-[9px] font-bold bg-coral/20 px-2 py-0.5 rounded-full hover:bg-coral/30 transition-colors"
                                    >
                                      Renovar
                                    </button>
                                  </div>
                                )}
                                {!item.isAvulsa && isEstoqueCritico && <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-400"><AlertTriangle size={12} /> Estoque crítico ({item.estoqueRestante} {item.unidadeMedida})</div>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div className="flex items-center gap-1.5">
                                {!item.tomada && !item.ignorada && !item.isAvulsa && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handleIgnorar(item); }} disabled={isProcessando || isProcessing} className="text-[10px] font-medium text-ink-muted bg-surface-raised px-2.5 py-1.5 rounded-full border border-surface-border/50 hover:bg-ink-muted/10 active:scale-95 transition-all disabled:opacity-50">Ignorar</button>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggle(item); }} disabled={isProcessando || isProcessing} className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full hover:bg-emerald-400/20 active:scale-95 transition-all disabled:opacity-50 shadow-sm">{isProcessando ? "..." : "✅ Tomar"}</button>
                                  </>
                                )}
                                {item.tomada && (
                                  <button onClick={(e) => { e.stopPropagation(); handleToggle(item); }} className="text-[10px] font-medium text-ink-muted bg-surface-raised px-2.5 py-1.5 rounded-full border border-surface-border/50 hover:bg-ink-muted/10 active:scale-95 transition-all">
                                    {item.isAvulsa ? "🗑️ Excluir" : "↩️ Desfazer"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* MODAL UNIFICADO DE DOSE RÁPIDA (SUBSTITUI O ANTIGO BOTTOMSHEET) */}
        <QuickDoseModal
          isOpen={isDoseModalOpen}
          onClose={() => setIsDoseModalOpen(false)}
          onSuccess={() => {
            if (typeof window !== "undefined") window.dispatchEvent(new Event("sync:process"));
          }}
        />

        {/* MODAL: ESTOQUE BAIXO */}
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
                <div className="flex items-center gap-2 pt-2">
                  <button onClick={() => { trigger("vibrate"); setModalAberto(false); }} className="flex-1 rounded-2xl border border-surface-border bg-surface-raised py-3 text-xs font-semibold text-ink-muted active:scale-95 transition-all">Depois</button>
                  <button onClick={handleSalvarRenovacaoDoModal} disabled={isProcessing} className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-semibold text-void shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? "Salvando..." : "Repor e Renovar"}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
