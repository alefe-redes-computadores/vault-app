"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Pill,
  FileWarning,
  Stethoscope,
  Building2,
  ChevronRight,
  Clock,
  Activity,
  FolderHeart,
  Brain,
  ShieldAlert,
  HeartPulse,
  Flame,
  FlaskConical,
  CheckCircle2,
  MapPin,
  Calendar,
  DollarSign,
  CalendarCheck2,
  FileHeart,
  Plus,
  X
} from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useLiveQuery } from "dexie-react-hooks";
// ✅ IMPORT corrigido: safeUpdateMedicamento e getLocalTodayISO adicionados
import { db, safeUpdateMedicamento } from "@/lib/db";
import { HealthNotifications } from "@/components/HealthNotifications";
import { MedicamentosNotifications } from "@/components/MedicamentosNotifications";
import {
  getDocumentAlerts,
  getExameAlerts,
  alertLevelColor,
  alertLevelLabel,
  getLocalTodayISO,
  type HealthAlert,
} from "@/lib/health-utils";

function getTratamentoIcon(nome: string) {
  const n = (nome || "").toLowerCase();
  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;
  return Activity;
}

function AlertRow({ alert }: { alert: HealthAlert }) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const color = alertLevelColor(alert.level);
  
  const isReceita = alert.title?.toLowerCase().includes("receita") || alert.subtitle?.toLowerCase().includes("receita");

  return (
    <div
      className="flex w-full items-center justify-between gap-2 rounded-[22px] border bg-surface p-3.5 shadow-sm transition-all"
      style={{ borderColor: `${color}30` }}
    >
      <button
        onClick={() => {
          trigger("vibrate");
          router.push(alert.href);
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[0.985]"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${color}18` }}
        >
          {alert.kind === "exame" ? (
            <FlaskConical size={18} style={{ color }} />
          ) : (
            <FileWarning size={18} style={{ color }} />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-sm font-semibold text-ink-primary">
            {alert.title}
          </p>
          <p className="truncate text-xs text-ink-muted">{alert.subtitle}</p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {alertLevelLabel(alert.level, alert.daysUntil)}
        </span>

        {isReceita && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              trigger("vibrate");
              router.push("/saude/renovacao/nova");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised border border-surface-border/50 text-ink-muted hover:border-emerald-400/50 hover:text-emerald-400 active:scale-95 transition-all shadow-sm"
            title="Adicionar Renovação"
          >
            <Plus size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SaudePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  // ✅ CORREÇÃO 1: Fuso horário local para o painel principal
  const hoje = getLocalTodayISO();

  const documents = useDocuments();
  const { medicamentos } = useMedicamentos();
  const { medicos } = useMedicos();
  const { farmacias } = useFarmacias();
  const { hospitais } = useHospitais();
  const { locais } = useLocais();
  const { doseLogs, marcarDose } = useDoseLogs(hoje);

  const tratamentos = useLiveQuery(() => db.tratamentos.toArray(), []) || [];
  const exames = useLiveQuery(() => db.table("exames").toArray(), []) || [];
  const renovacoes = useLiveQuery(() => db.table("renovacoes").toArray(), []) || [];

  const consultasHoje = useLiveQuery(() => db.table("consultas").where("data").equals(hoje).toArray(), [hoje]) || [];
  const cirurgiasHoje = useLiveQuery(() => db.table("cirurgias").where("data").equals(hoje).toArray(), [hoje]) || [];
  const examesHoje = useLiveQuery(() => db.table("exames").where("data").equals(hoje).toArray(), [hoje]) || [];

  const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false);
  
  // ✅ CORREÇÃO 2: Travas anti-clique duplo adicionadas no Dashboard
  const [processandoDoseId, setProcessandoDoseId] = useState<string | null>(null);
  const [isProcessandoTudo, setIsProcessandoTudo] = useState(false);

  const totalGastoGeral = useMemo(() => {
    let soma = 0;
    renovacoes.forEach((r: any) => {
      if (typeof r.preco === "number" && r.preco > 0) {
        soma += r.preco;
      }
    });
    return soma;
  }, [renovacoes]);

  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const dosesPendentesAtrasadas = useMemo(() => {
    if (!medicamentos || !doseLogs) return [];
    const lista: Array<{ medicamentoId: string; nome: string; horario: string }> = [];

    for (const med of medicamentos) {
      if (!med.id || med.status === "descontinuado" || !med.estoque_horarios) continue;
      for (const horario of med.estoque_horarios) {
        if (!horario || horario > horaAtual) continue;
        const log = doseLogs.find((l) => l.medicamento_id === med.id && l.horario === horario);
        if (!log?.tomado_em) {
          lista.push({ medicamentoId: med.id, nome: med.nome, horario });
        }
      }
    }
    return lista;
  }, [medicamentos, doseLogs, horaAtual]);

  // ✅ CORREÇÃO 3: Lógica individual de "Tomar Dose" pelo modal com abatimento de estoque
  const handleTomarDosePendente = async (d: { medicamentoId: string; nome: string; horario: string }) => {
    if (processandoDoseId) return;
    
    setProcessandoDoseId(`${d.medicamentoId}-${d.horario}`);
    trigger("success");
    
    try {
      await marcarDose(d.medicamentoId, hoje, d.horario, true);
      
      const medOriginal = medicamentos?.find(m => m.id === d.medicamentoId);
      if (medOriginal && typeof medOriginal.estoque_quantidade === "number") {
        const unidadePorDose = medOriginal.estoque_unidade_por_dose || 1;
        const novoEstoque = Math.max(0, medOriginal.estoque_quantidade - unidadePorDose);
        await safeUpdateMedicamento(d.medicamentoId, {
          estoque_quantidade: novoEstoque,
          estoque_data_referencia: hoje
        });
      }
    } finally {
      setProcessandoDoseId(null);
    }
  };

  // ✅ CORREÇÃO 4: Lógica de "Tomar Tudo Agora" segura com abatimento de estoque em massa
  const handleTomarTodasAtrasadas = async () => {
    if (isProcessandoTudo) return;
    setIsProcessandoTudo(true);
    trigger("success");
    
    try {
      for (const d of dosesPendentesAtrasadas) {
        await marcarDose(d.medicamentoId, hoje, d.horario, true);
        
        const medOriginal = medicamentos?.find(m => m.id === d.medicamentoId);
        if (medOriginal && typeof medOriginal.estoque_quantidade === "number") {
          const unidadePorDose = medOriginal.estoque_unidade_por_dose || 1;
          const novoEstoque = Math.max(0, medOriginal.estoque_quantidade - unidadePorDose);
          await safeUpdateMedicamento(d.medicamentoId, {
            estoque_quantidade: novoEstoque,
            estoque_data_referencia: hoje
          });
        }
      }
      setModalPendenciasAberto(false);
    } finally {
      setIsProcessandoTudo(false);
    }
  };

  const docAlerts = useMemo(() => getDocumentAlerts(documents || []).filter(a => a.daysUntil <= 5), [documents]);
  const exameAlerts = useMemo(() => getExameAlerts(exames || []).filter(a => a.daysUntil <= 5), [exames]);

  const otherAlerts = useMemo(
    () => [...docAlerts, ...exameAlerts].sort((a, b) => a.daysUntil - b.daysUntil),
    [docAlerts, exameAlerts]
  );

  const isLoading = documents === undefined || medicamentos === undefined || exames === undefined;

  if (isLoading) return <LoadingSkeleton />;

  const quickActions = [
    { id: "nova-consulta", label: "Consulta", icon: Stethoscope, path: "/saude/consultas/nova" },
    { id: "nova-cirurgia", label: "Cirurgia", icon: Activity, path: "/saude/cirurgias/nova" },
    { id: "novo-medicamento", label: "Medicamento", icon: Pill, path: "/saude/medicamentos/novo" },
    { id: "novo-local", label: "Posto / Local", icon: MapPin, path: "/saude/locais/novo" },
  ];

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-28">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 header-safe-top backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { trigger("vibrate"); router.back(); }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised transition-all active:scale-95"
            >
              <ArrowLeft size={18} className="text-ink-primary" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Heart size={18} className="text-coral" />
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Vault
                </p>
              </div>
              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Saúde
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                {dosesPendentesAtrasadas.length > 0 
                  ? `${dosesPendentesAtrasadas.length} dose(s) pendente(s)` 
                  : "Painel Clínico atualizado"}
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-6 px-5 pt-5">
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="grid grid-cols-4 gap-2"
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => { trigger("vibrate"); router.push(action.path); }}
                  className="flex flex-col items-center gap-2 rounded-[20px] border border-surface-border/50 bg-surface p-3 text-center transition-all active:scale-[0.95] hover:bg-surface-raised/80"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ice/10 text-ice">
                    <Icon size={17} />
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-ink-muted">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.01 }}
            onClick={() => { trigger("vibrate"); router.push("/saude/hoje"); }}
            className="flex items-center justify-between rounded-[24px] border border-ice/40 bg-gradient-to-r from-ice/10 via-surface to-surface p-4 shadow-sm cursor-pointer hover:border-ice/60 transition-all active:scale-[0.985]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ice/20 text-ice">
                <CalendarCheck2 size={22} />
              </div>
              <div>
                <p className="text-xs uppercase font-mono text-ice font-bold">Rotina e Doses de Hoje</p>
                <p className="text-sm font-semibold text-ink-primary mt-0.5">
                  Ver cronograma, horários e compromissos
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-ice" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.02 }}
            onClick={() => { trigger("vibrate"); router.push("/saude/renovacao"); }}
            className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm cursor-pointer hover:border-ice/30 transition-all active:scale-[0.985]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <DollarSign size={22} />
              </div>
              <div>
                <p className="text-xs uppercase font-mono text-ink-muted">Investimento em Saúde</p>
                <p className="font-mono text-lg font-bold text-ink-primary mt-0.5">
                  R$ {totalGastoGeral.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-[10px] text-ink-faint">Total em {renovacoes.length} renovação(ões) registradas</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-ice">
              <span>Histórico</span>
              <ChevronRight size={16} />
            </div>
          </motion.div>

          {(consultasHoje.length > 0 || cirurgiasHoje.length > 0 || examesHoje.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.025 }}
              className="rounded-[26px] border border-coral/30 bg-coral/5 p-4 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-coral" />
                <h3 className="font-display text-sm font-bold text-ink-primary">Você tem compromissos hoje!</h3>
              </div>
              <div className="space-y-2">
                {consultasHoje.map((c: any) => (
                  <div key={c.id} onClick={() => router.push(`/saude/consultas/detalhes?id=${c.id}`)} className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-surface-border/50 cursor-pointer text-xs">
                    <span className="font-semibold text-ink-primary">Consulta: {c.especialidade} (Dr(a). {c.medico})</span>
                    <span className="text-coral font-mono font-bold">Hoje</span>
                  </div>
                ))}
                {cirurgiasHoje.map((cir: any) => (
                  <div key={cir.id} onClick={() => router.push(`/saude/cirurgias/detalhes?id=${cir.id}`)} className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-surface-border/50 cursor-pointer text-xs">
                    <span className="font-semibold text-ink-primary">Cirurgia: {cir.procedimento}</span>
                    <span className="text-coral font-mono font-bold">Hoje</span>
                  </div>
                ))}
                {examesHoje.map((ex: any) => (
                  <div key={ex.id} onClick={() => router.push(`/saude/exames/detalhes?id=${ex.id}`)} className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-surface-border/50 cursor-pointer text-xs">
                    <span className="font-semibold text-ink-primary">Exame: {ex.nome}</span>
                    <span className="text-coral font-mono font-bold">Hoje</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {dosesPendentesAtrasadas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[26px] border border-coral/30 bg-surface p-5 shadow-lg shadow-coral/5"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-coral/20 text-coral">
                  <Clock size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold">{dosesPendentesAtrasadas.length} pendências</h3>
                  <p className="text-[11px] text-ink-muted">Ações rápidas de saúde</p>
                </div>
                <button 
                  onClick={() => setModalPendenciasAberto(true)}
                  className="px-4 py-2 bg-coral text-white text-[11px] font-bold rounded-xl active:scale-95"
                >
                  Gerenciar
                </button>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.03 }}
            className="space-y-4"
          >
            <HealthNotifications />
            <MedicamentosNotifications />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.05 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderHeart size={15} className="text-violet-400" />
                <h2 className="font-display text-sm font-semibold text-ink-primary">
                  Tratamentos Ativos
                </h2>
              </div>
            </div>

            {tratamentos.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-6 text-center">
                <p className="text-sm text-ink-muted">Nenhum tratamento cadastrado.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tratamentos.map((tratamento) => {
                  const IconComponent = getTratamentoIcon(tratamento.nome);
                  const cor = (tratamento as any).cor || "#8B5CF6"; 
                  
                  return (
                    <button
                      key={tratamento.id}
                      onClick={() => { trigger("vibrate"); router.push(`/saude/tratamentos/detalhes?id=${tratamento.id}`); }}
                      className="flex w-full items-center justify-between rounded-[22px] border bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80 overflow-hidden"
                      style={{ borderLeft: `5px solid ${cor}`, borderColor: `${cor}30` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: `${cor}15`, color: cor }}
                        >
                          <IconComponent size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink-primary">{tratamento.nome}</p>
                          <p className="truncate text-xs text-ink-muted capitalize">
                            {tratamento.status === 'ativo' ? 'Em andamento' : tratamento.status === 'concluido' ? 'Concluído' : 'Suspenso'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-ink-faint" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {otherAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.08 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <FileWarning size={15} className="text-coral" />
                <h2 className="font-display text-sm font-semibold text-ink-primary">
                  Atenção: Prazos Críticos
                </h2>
              </div>
              
              <div className="space-y-2.5">
                {otherAlerts.map((alert) => (
                  <AlertRow key={`${alert.kind}-${alert.id}`} alert={alert} />
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            className="grid grid-cols-2 gap-2.5"
          >
            <button
              onClick={() => { trigger("vibrate"); router.push("/saude/consultas"); }}
              className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/12 text-ice">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-primary">Consultas</p>
                <p className="text-[10px] text-ink-muted">Agenda clínica</p>
              </div>
            </button>

            <button
              onClick={() => { trigger("vibrate"); router.push("/saude/cirurgias"); }}
              className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral/12 text-coral">
                <Activity size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-primary">Cirurgias</p>
                <p className="text-[10px] text-ink-muted">Procedimentos</p>
              </div>
            </button>
            
            <button
              onClick={() => { trigger("vibrate"); router.push("/saude/exames"); }}
              className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/12 text-violet-400">
                <FlaskConical size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-primary">Exames</p>
                <p className="text-[10px] text-ink-muted">Resultados e pedidos</p>
              </div>
            </button>

            <button
              onClick={() => { trigger("vibrate"); router.push("/saude/medicamentos"); }}
              className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/12 text-emerald-400">
                <Pill size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-primary">Remédios</p>
                <p className="text-[10px] text-ink-muted">Estoque e gaveta</p>
              </div>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.14 }}
            className="rounded-[24px] border border-surface-border/50 bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Sua rede e locais
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <button
                onClick={() => { trigger("vibrate"); router.push("/saude/medicos"); }}
                className="rounded-2xl bg-surface-raised/60 py-3 px-2 transition-all active:scale-95 hover:bg-surface-raised border border-transparent hover:border-surface-border/50 cursor-pointer flex flex-col items-center justify-center"
              >
                <Stethoscope size={16} className="text-ice mb-1" />
                <p className="font-display text-base font-semibold text-ink-primary">{(medicos || []).length}</p>
                <p className="text-[10px] text-ink-muted">Médicos</p>
              </button>

              <button
                onClick={() => { trigger("vibrate"); router.push("/saude/farmacias"); }}
                className="rounded-2xl bg-surface-raised/60 py-3 px-2 transition-all active:scale-95 hover:bg-surface-raised border border-transparent hover:border-surface-border/50 cursor-pointer flex flex-col items-center justify-center"
              >
                <Pill size={16} className="text-amber-400 mb-1" />
                <p className="font-display text-base font-semibold text-ink-primary">{(farmacias || []).length}</p>
                <p className="text-[10px] text-ink-muted">Farmácias</p>
              </button>

              <button
                onClick={() => { trigger("vibrate"); router.push("/saude/hospitais"); }}
                className="rounded-2xl bg-surface-raised/60 py-3 px-2 transition-all active:scale-95 hover:bg-surface-raised border border-transparent hover:border-surface-border/50 cursor-pointer flex flex-col items-center justify-center"
              >
                <Building2 size={16} className="text-ice mb-1" />
                <p className="font-display text-base font-semibold text-ink-primary">{(hospitais || []).length}</p>
                <p className="text-[10px] text-ink-muted">Hospitais</p>
              </button>

              <button
                onClick={() => { trigger("vibrate"); router.push("/saude/locais"); }}
                className="rounded-2xl bg-surface-raised/60 py-3 px-2 transition-all active:scale-95 hover:bg-surface-raised border border-transparent hover:border-surface-border/50 cursor-pointer flex flex-col items-center justify-center"
              >
                <MapPin size={16} className="text-emerald-400 mb-1" />
                <p className="font-display text-base font-semibold text-ink-primary">{(locais || []).length}</p>
                <p className="text-[10px] text-ink-muted">Postos</p>
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.16 }}
            className="pb-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Arquivo Clínico
              </h2>
            </div>
            <button
              onClick={() => { trigger("vibrate"); router.push("/saude/documentos"); }}
              className="flex w-full items-center justify-between rounded-[22px] border border-ice/30 bg-gradient-to-r from-ice/5 to-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:border-ice/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                  <FileHeart size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Documentos de Saúde</p>
                  <p className="text-[10px] text-ink-muted">Receitas, laudos e exames arquivados</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ice" />
            </button>
          </motion.div>
        </section>

        <AnimatePresence>
          {modalPendenciasAberto && (
            <div 
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-void/80 backdrop-blur-md"
              onClick={() => setModalPendenciasAberto(false)}
            >
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-surface rounded-[32px] p-6 shadow-2xl space-y-5 border border-surface-border"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink-primary">Doses Pendentes</h3>
                    <p className="text-xs text-ink-muted">Gerencie suas pendências de hoje</p>
                  </div>
                  <button 
                    onClick={() => setModalPendenciasAberto(false)} 
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-raised hover:bg-surface-border transition-colors"
                  >
                    <X size={16}/>
                  </button>
                </div>
                
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {dosesPendentesAtrasadas.map((d, index) => {
                    const isProcessingThisDose = processandoDoseId === `${d.medicamentoId}-${d.horario}`;
                    return (
                      <div key={`${d.medicamentoId}-${index}`} className={`flex items-center justify-between p-3.5 bg-surface-raised rounded-2xl border border-surface-border/50 ${isProcessingThisDose ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-primary truncate">{d.nome}</p>
                          <p className="text-[10px] text-ink-muted font-mono">{d.horario}</p>
                        </div>
                        <button 
                          onClick={() => handleTomarDosePendente(d)}
                          disabled={isProcessingThisDose || isProcessandoTudo}
                          className="text-emerald-400 font-bold text-xs px-3 py-1.5 rounded-lg bg-emerald-400/10 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isProcessingThisDose ? "Salvando..." : "Tomar"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => { setModalPendenciasAberto(false); router.push("/saude/hoje"); }} 
                    className="p-3.5 text-xs font-semibold rounded-2xl bg-surface-raised hover:bg-surface-border transition-all active:scale-95"
                  >
                    Expandir Cronograma
                  </button>
                  <button 
                    onClick={handleTomarTodasAtrasadas} 
                    disabled={isProcessandoTudo || dosesPendentesAtrasadas.length === 0}
                    className="p-3.5 text-xs font-semibold rounded-2xl bg-coral text-white shadow-md shadow-coral/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessandoTudo ? "Processando..." : "Tomar Tudo Agora"}
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
