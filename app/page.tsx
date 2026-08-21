// app/(app)/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  MapPin,
  Calendar,
  DollarSign,
  FileHeart,
  Plus,
  X,
  Bell,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePersons } from "@/hooks/usePersons";
import { useDocuments } from "@/hooks/useDocuments";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useMedicos } from "@/hooks/useMedicos";
import { useFarmacias } from "@/hooks/useFarmacias";
import { useHospitais } from "@/hooks/useHospitais";
import { useLocais } from "@/hooks/useLocais";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { SimpleSpinner } from "@/components/loading/SimpleSpinner";
import { useLiveQuery } from "dexie-react-hooks";
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
  type AlertLevel,
} from "@/lib/health-utils";
import { sugerirRenovacao } from "@/lib/health-insights";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { PendingDosesModal } from "@/components/PendingDosesModal";

// 🔧 NOVA FUNÇÃO: Filtro por mês atual
function isMesAtual(dataStr: string): boolean {
  if (!dataStr) return false;
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return false;
  const hoje = new Date();
  return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
}

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
  const isReceita =
    alert.title?.toLowerCase().includes("receita") ||
    alert.subtitle?.toLowerCase().includes("receita");

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
          ) : alert.kind === "consulta" ? (
            <Stethoscope size={18} style={{ color }} />
          ) : (
            <FileWarning size={18} style={{ color }} />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-sm font-semibold text-ink-primary">{alert.title}</p>
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

function gerarAlertasDashboard(
  medicamentos: any[],
  renovacoes: any[],
  consultas: any[],
  exames: any[],
  today: string
) {
  const alertas = [];

  const semEstoque = (medicamentos || []).filter(
    (m) => (m.estoque_quantidade || 0) <= 0 && m.status === "ativo"
  );
  for (const med of semEstoque) {
    alertas.push({
      id: `estoque-${med.id}`,
      titulo: `${med.nome} sem estoque`,
      descricao: `Adicione ${med.dosagem} ao estoque para continuar o tratamento.`,
      urgencia: "alta",
      cor: "#EF4444",
      icone: <AlertCircle size={16} className="text-coral" />,
      acao: { rota: `/saude/medicamentos/detalhes?id=${med.id}` },
    });
  }

  const renovacoesVencendo = (renovacoes || []).filter((r) => {
    if (!r.proxima_renovacao) return false;
    const diff = Math.floor(
      (new Date(r.proxima_renovacao).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff <= 7 && diff >= 0;
  });
  for (const ren of renovacoesVencendo) {
    const med = (medicamentos || []).find((m) => m.id === ren.medicamento_id);
    alertas.push({
      id: `renovacao-${ren.id}`,
      titulo: `Receita de ${med?.nome || "medicamento"} vence em ${Math.ceil(
        (new Date(ren.proxima_renovacao).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      )} dias`,
      descricao: `Agende uma consulta para renovar a receita.`,
      urgencia: "media",
      cor: "#F59E0B",
      icone: <Calendar size={16} className="text-amber-500" />,
      acao: { rota: `/saude/renovacao/detalhes?id=${ren.id}` },
    });
  }

  const consultasHoje = (consultas || []).filter(
    (c) => c.data === today && c.status === "agendada"
  );
  for (const consulta of consultasHoje) {
    alertas.push({
      id: `consulta-${consulta.id}`,
      titulo: `Consulta hoje com ${consulta.medico}`,
      descricao: `${consulta.especialidade} - ${consulta.horario || "horário não informado"}`,
      urgencia: "alta",
      cor: "#3B82F6",
      icone: <Stethoscope size={16} className="text-ice" />,
      acao: { rota: `/saude/consultas/detalhes?id=${consulta.id}` },
    });
  }

  (exames || []).forEach((exame) => {
    if (!exame.data_retorno) return;
    const diff = Math.floor(
      (new Date(exame.data_retorno).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diff < 0) {
      alertas.push({
        id: `exame-vencido-${exame.id}`,
        titulo: `Prazo do exame "${exame.nome}" venceu`,
        descricao: `Apresente o resultado o quanto antes.`,
        urgencia: "alta",
        cor: "#EF4444",
        icone: <FlaskConical size={16} className="text-coral" />,
        acao: { rota: `/saude/exames/detalhes?id=${exame.id}` },
      });
    } else if (diff <= 7) {
      alertas.push({
        id: `exame-proximo-${exame.id}`,
        titulo: `Apresentação do exame "${exame.nome}" em ${diff} dias`,
        descricao: `Não se esqueça de levar o resultado.`,
        urgencia: "media",
        cor: "#F59E0B",
        icone: <FlaskConical size={16} className="text-amber-500" />,
        acao: { rota: `/saude/exames/detalhes?id=${exame.id}` },
      });
    }
  });

  const ordem: Record<string, number> = {
    alta: 0,
    media: 1,
    baixa: 2,
    nenhuma: 3,
  };
  return alertas.sort((a, b) => ordem[a.urgencia] - ordem[b.urgencia]);
}

export default function HomePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();
  const { user, loading: authLoading } = useAuth();
  const hoje = getLocalTodayISO();

  const persons = usePersons();
  const { activePersonId } = useActivePersonId();

  const documents = useDocuments();
  const { medicamentos: medicamentosTodas } = useMedicamentos();
  const { medicos = [] } = useMedicos();
  const { farmacias = [] } = useFarmacias();
  const { hospitais = [] } = useHospitais();
  const { locais = [] } = useLocais();
  const { doseLogs, marcarComoTomada: marcarDose } = useDoseLogs(hoje);

  const tratamentos = useLiveQuery(
    () => (activePersonId ? db.tratamentos.where('person_id').equals(activePersonId).toArray() : []),
    [activePersonId]
  ) || [];

  const exames = useLiveQuery(
    () => activePersonId 
      ? db.exames.where('person_id').equals(activePersonId)
          .filter(e => isMesAtual(e.data ?? '') || isMesAtual(e.created_at ?? ''))
          .toArray() 
      : [],
    [activePersonId]
  ) || [];

  const renovacoes = useLiveQuery(
    () => activePersonId 
      ? db.renovacoes.where('person_id').equals(activePersonId)
          .filter(e => isMesAtual(e.data ?? '') || isMesAtual(e.created_at ?? ''))
          .toArray() 
      : [],
    [activePersonId]
  ) || [];

  const consultas = useLiveQuery(
    () => activePersonId 
      ? db.consultas.where('person_id').equals(activePersonId)
          .filter(e => isMesAtual(e.data ?? '') || isMesAtual(e.created_at ?? ''))
          .toArray() 
      : [],
    [activePersonId]
  ) || [];

  const cirurgias = useLiveQuery(
    () => activePersonId 
      ? db.cirurgias.where('person_id').equals(activePersonId)
          .filter(e => isMesAtual(e.data ?? '') || isMesAtual(e.created_at ?? ''))
          .toArray() 
      : [],
    [activePersonId]
  ) || [];

  const activePerson = useMemo(() => {
    return persons.find((p) => p.id === activePersonId) || persons[0] || null;
  }, [persons, activePersonId]);

  const displayName =
    activePerson?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";
  const avatarUrl = activePerson?.avatar_url || user?.user_metadata?.avatar_url;

  const medicamentos = useMemo(
    () => (activePersonId ? (medicamentosTodas || []).filter((m) => m.person_id === activePersonId || !m.person_id) : []),
    [medicamentosTodas, activePersonId]
  );

  const consultasHoje = useMemo(
    () => consultas.filter((c) => c.data === hoje),
    [consultas, hoje]
  );
  const examesHoje = useMemo(
    () => exames.filter((e) => e.data === hoje),
    [exames, hoje]
  );
  const cirurgiasHoje = useMemo(
    () => cirurgias.filter((c) => c.data === hoje),
    [cirurgias, hoje]
  );

  const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false);
  const [processandoDoseId, setProcessandoDoseId] = useState<string | null>(null);
  const [isProcessandoTudo, setIsProcessandoTudo] = useState(false);

  const horaAtual = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const metricasFinanceiras = useMemo(() => {
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoDoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    let gastoMesAtual = 0;
    let gastoMesAnterior = 0;

    (renovacoes || []).forEach((r) => {
      const precoNumerico = Number(r.preco);
      if (!isNaN(precoNumerico) && precoNumerico > 0 && r.data) {
        let dataR = new Date(r.data);
        if (isNaN(dataR.getTime()) && r.data.includes("/")) {
          const partes = r.data.split("/");
          if (partes.length === 3) {
            dataR = new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`);
          }
        }
        if (!isNaN(dataR.getTime())) {
          if (dataR.getMonth() === mesAtual && dataR.getFullYear() === anoAtual) {
            gastoMesAtual += precoNumerico;
          } else if (dataR.getMonth() === mesAnterior && dataR.getFullYear() === anoDoMesAnterior) {
            gastoMesAnterior += precoNumerico;
          }
        }
      }
    });

    (medicamentos || []).forEach((m: any) => {
      const custoIni = Number(m.preco || 0);
      if (custoIni > 0 && m.created_at) {
        const dataM = new Date(m.created_at);
        if (!isNaN(dataM.getTime())) {
          if (dataM.getMonth() === mesAtual && dataM.getFullYear() === anoAtual) {
            gastoMesAtual += custoIni;
          } else if (dataM.getMonth() === mesAnterior && dataM.getFullYear() === anoDoMesAnterior) {
            gastoMesAnterior += custoIni;
          }
        }
      }
    });

    const diff = gastoMesAtual - gastoMesAnterior;
    return { gastoMesAtual, gastoMesAnterior, diff };
  }, [renovacoes, medicamentos]);

  const dosesPendentesAtrasadas = useMemo(() => {
    if (!medicamentos || !doseLogs) return [];
    const lista: Array<{ medicamentoId: string; nome: string; horario: string }> = [];

    for (const med of medicamentos) {
      if (!med.id || med.status === "descontinuado" || !med.estoque_horarios) continue;
      for (const horario of med.estoque_horarios) {
        if (!horario || horario > horaAtual) continue;
        const log = (doseLogs || []).find(
          (l) => l.medicamento_id === med.id && l.horario === horario
        );
        if (!log?.tomado_em) {
          lista.push({ medicamentoId: med.id, nome: med.nome, horario });
        }
      }
    }
    return lista;
  }, [medicamentos, doseLogs, horaAtual]);

  const alertasAgrupados = useMemo(() => {
    return gerarAlertasDashboard(
      medicamentos || [],
      renovacoes || [],
      consultas || [],
      exames || [],
      hoje
    );
  }, [medicamentos, renovacoes, consultas, exames, hoje]);

  const alertasEstoque = useMemo<HealthAlert[]>(() => {
    if (!medicamentos) return [];
    const alerts: HealthAlert[] = [];
    medicamentos.forEach((m) => {
      if (m.status === "descontinuado" || !m.id) return;
      const insight = sugerirRenovacao(m);
      if (insight.deveRenovar) {
        const alertLvl: AlertLevel = insight.urgencia === "alta" ? "urgente" : "atencao";
        alerts.push({
          id: m.id,
          title: m.nome,
          subtitle: insight.mensagem,
          level: alertLvl,
          kind: "estoque",
          href: `/saude/medicamentos/detalhes?id=${m.id}`,
          daysUntil: 0,
          date: m.proxima_renovacao || hoje,
        });
      }
    });
    return alerts;
  }, [medicamentos, hoje]);

  const alertasConsultas = useMemo<HealthAlert[]>(() => {
    const medicosUnicosIds = Array.from(
      new Set((consultas || []).map((c) => c.medico_id).filter(Boolean))
    );
    const alertas: HealthAlert[] = [];

    medicosUnicosIds.forEach((medicoId) => {
      if (!medicoId) return;
      const consMedico = (consultas || []).filter((c) => c.medico_id === medicoId);
      const consFuturas = consMedico.filter((c) => c.data >= hoje);
      if (consFuturas.length === 0) {
        const ultimaCons = [...consMedico].sort((a, b) => b.data.localeCompare(a.data))[0];
        if (ultimaCons) {
          const diffDias = Math.floor(
            (new Date(hoje).getTime() - new Date(ultimaCons.data).getTime()) / (1000 * 3600 * 24)
          );
          if (diffDias > 180) {
            alertas.push({
              id: `cons-${medicoId}`,
              title: `Dr(a). ${ultimaCons.medico}`,
              subtitle: `Sem retorno médico há ${Math.floor(diffDias / 30)} meses`,
              level: "vencido",
              kind: "consulta",
              href: `/saude/medicos/detalhes?id=${medicoId}`,
              daysUntil: -diffDias,
              date: ultimaCons.data,
            });
          }
        }
      }
    });
    return alertas;
  }, [consultas, hoje]);

  const docAlerts = useMemo(
    () => getDocumentAlerts(documents || []).filter((a) => a.daysUntil <= 5),
    [documents]
  );
  const exameAlerts = useMemo(
    () => getExameAlerts(exames || []).filter((a: any) => a.daysUntil <= 5),
    [exames]
  );

  const otherAlerts = useMemo(
    () => [...docAlerts, ...exameAlerts, ...alertasEstoque, ...alertasConsultas].sort(
      (a, b) => a.daysUntil - b.daysUntil
    ),
    [docAlerts, exameAlerts, alertasEstoque, alertasConsultas]
  );

  const isLoading =
    authLoading || documents === undefined || medicamentosTodas === undefined || exames === undefined;

  if (isLoading) return <SimpleSpinner />;

  const quickActions = [
    { id: "consultas", label: "Consultas", icon: Calendar, path: "/saude/consultas" },
    { id: "cirurgias", label: "Cirurgias", icon: Activity, path: "/saude/cirurgias" },
    { id: "exames", label: "Exames", icon: FlaskConical, path: "/saude/exames" },
    { id: "medicamentos", label: "Remédios", icon: Pill, path: "/saude/medicamentos" },
  ];

  const redeActions = [
    { id: "medicos", label: "Médicos", icon: Stethoscope, path: "/saude/medicos", count: medicos?.length || 0 },
    { id: "farmacias", label: "Farmácias", icon: Pill, path: "/saude/farmacias", count: farmacias?.length || 0 },
    { id: "hospitais", label: "Hospitais", icon: Building2, path: "/saude/hospitais", count: hospitais?.length || 0 },
    { id: "locais", label: "Postos", icon: MapPin, path: "/saude/locais", count: locais?.length || 0 },
  ];

  const handleTomarDosePendente = async (d: {
    medicamentoId: string;
    nome: string;
    horario: string;
  }) => {
    if (processandoDoseId) return;
    setProcessandoDoseId(`${d.medicamentoId}-${d.horario}`);
    trigger("success");
    try {
      await marcarDose(d.medicamentoId, hoje, d.horario);
      const medOriginal = (medicamentos || []).find((m) => m.id === d.medicamentoId);
      if (medOriginal && typeof medOriginal.estoque_quantidade === "number") {
        const unidadePorDose = medOriginal.estoque_unidade_por_dose || 1;
        const novoEstoque = Math.max(0, medOriginal.estoque_quantidade - unidadePorDose);
        await safeUpdateMedicamento(d.medicamentoId, {
          estoque_quantidade: novoEstoque,
          estoque_data_referencia: hoje,
        });
      }
    } finally {
      setProcessandoDoseId(null);
    }
  };

  const handleTomarTodasAtrasadas = async () => {
    if (isProcessandoTudo) return;
    setIsProcessandoTudo(true);
    trigger("success");
    try {
      for (const d of dosesPendentesAtrasadas) {
        await marcarDose(d.medicamentoId, hoje, d.horario);
        const medOriginal = (medicamentos || []).find((m) => m.id === d.medicamentoId);
        if (medOriginal && typeof medOriginal.estoque_quantidade === "number") {
          const unidadePorDose = medOriginal.estoque_unidade_por_dose || 1;
          const novoEstoque = Math.max(0, medOriginal.estoque_quantidade - unidadePorDose);
          await safeUpdateMedicamento(d.medicamentoId, {
            estoque_quantidade: novoEstoque,
            estoque_data_referencia: hoje,
          });
        }
      }
      setModalPendenciasAberto(false);
    } finally {
      setIsProcessandoTudo(false);
    }
  };

  return (
    <PageTransition>
      {/* 🔧 CORRIGIDO: alterado de pb-28 para pb-40 para evitar corte atrás do menu inferior */}
      <main className="min-h-screen bg-void pb-40 overflow-y-auto">
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 header-safe-top pb-4 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/mais");
              }}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              {avatarUrl ? (
                <span className="glow-ice flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
              ) : (
                <div className="ring-gradient glow-ice flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-void">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ice/90">
                  Painel Clínico
                </p>
                <h1 className="mt-1 truncate font-display text-base font-semibold text-ink-primary">
                  Olá, {displayName.split(" ")[0]}
                </h1>
                <p className="text-xs text-ink-muted">
                  {dosesPendentesAtrasadas.length > 0
                    ? `${dosesPendentesAtrasadas.length} pendência${
                        dosesPendentesAtrasadas.length > 1 ? "s" : ""
                      } hoje`
                    : "Tudo atualizado"}
                </p>
              </div>
            </button>
          </motion.div>
        </header>

        <section className="space-y-6 px-5 pt-5">
          {alertasAgrupados.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.02 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-coral" />
                <h2 className="font-display text-base font-semibold text-ink-primary">
                  Atenção Urgente
                </h2>
                <span className="ml-auto text-xs text-ink-muted">
                  {alertasAgrupados.length} alertas
                </span>
              </div>
              <div className="space-y-2">
                {alertasAgrupados.map((alerta) => (
                  <div
                    key={alerta.id}
                    className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${
                      alerta.urgencia === "alta"
                        ? "border-coral/30 bg-coral/10"
                        : alerta.urgencia === "media"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-ice/20 bg-ice/5"
                    }`}
                    style={{ borderLeftColor: alerta.cor, borderLeftWidth: 4 }}
                  >
                    <div className="mt-0.5">{alerta.icone}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-primary">{alerta.titulo}</p>
                      <p className="text-xs text-ink-muted">{alerta.descricao}</p>
                    </div>
                    <button
                      onClick={() => {
                        trigger("vibrate");
                        router.push(alerta.acao.rota);
                      }}
                      className="shrink-0 text-xs font-medium text-ice hover:text-ice/80 transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.03 }}
            onClick={() => {
              trigger("vibrate");
              router.push("/saude/renovacao");
            }}
            className="flex items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 shadow-sm cursor-pointer hover:border-ice/30 transition-all active:scale-[0.985]"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <DollarSign size={22} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono text-ink-muted">
                  Gastos com Saúde (Mês)
                </p>
                <p className="font-mono text-lg font-bold text-ink-primary mt-0.5">
                  R$ {metricasFinanceiras.gastoMesAtual.toFixed(2).replace(".", ",")}
                </p>
                {metricasFinanceiras.diff !== 0 && (
                  <p
                    className={`text-[10px] mt-0.5 font-bold ${
                      metricasFinanceiras.diff > 0 ? "text-coral" : "text-emerald-400"
                    }`}
                  >
                    {metricasFinanceiras.diff > 0 ? "+" : "-"} R${" "}
                    {Math.abs(metricasFinanceiras.diff).toFixed(2).replace(".", ",")} vs mês
                    passado
                  </p>
                )}
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
              transition={{ duration: 0.24, delay: 0.04 }}
              className="rounded-[26px] border border-coral/30 bg-coral/5 p-4 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-coral" />
                <h3 className="font-display text-sm font-bold text-ink-primary">
                  Compromissos de hoje
                </h3>
              </div>
              <div className="space-y-2">
                {consultasHoje.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/consultas/detalhes?id=${c.id}`);
                    }}
                    className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-surface-border/50 cursor-pointer text-xs active:scale-[0.985] transition-all"
                  >
                    <span className="font-semibold text-ink-primary">
                      Consulta: {c.especialidade} (Dr(a). {c.medico})
                    </span>
                    <span className="text-coral font-mono font-bold">Hoje</span>
                  </div>
                ))}
                {cirurgiasHoje.map((cir: any) => (
                  <div
                    key={cir.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/cirurgias/detalhes?id=${cir.id}`);
                    }}
                    className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-surface-border/50 cursor-pointer text-xs active:scale-[0.985] transition-all"
                  >
                    <span className="font-semibold text-ink-primary">
                      Cirurgia: {cir.procedimento}
                    </span>
                    <span className="text-coral font-mono font-bold">Hoje</span>
                  </div>
                ))}
                {examesHoje.map((ex: any) => (
                  <div
                    key={ex.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(`/saude/exames/detalhes?id=${ex.id}`);
                    }}
                    className="flex items-center justify-between bg-surface p-3 rounded-2xl border border-surface-border/50 cursor-pointer text-xs active:scale-[0.985] transition-all"
                  >
                    <span className="font-semibold text-ink-primary">
                      Exame: {ex.nome}
                    </span>
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
                  <h3 className="text-sm font-bold">
                    {dosesPendentesAtrasadas.length} pendências
                  </h3>
                  <p className="text-[11px] text-ink-muted">Ações rápidas de saúde</p>
                </div>
                <button
                  onClick={() => {
                    trigger("vibrate");
                    setModalPendenciasAberto(true);
                  }}
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
            transition={{ duration: 0.24, delay: 0.05 }}
            className="space-y-4"
          >
            <HealthNotifications />
            <MedicamentosNotifications />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.06 }}
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
                {tratamentos.map((tratamento: any) => {
                  const IconComponent = getTratamentoIcon(tratamento.nome);
                  const cor = tratamento.cor || "#8B5CF6";
                  return (
                    <button
                      key={tratamento.id}
                      onClick={() => {
                        trigger("vibrate");
                        router.push(`/saude/tratamentos/detalhes?id=${tratamento.id}`);
                      }}
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
                          <p className="truncate text-sm font-semibold text-ink-primary">
                            {tratamento.nome}
                          </p>
                          <p className="truncate text-xs text-ink-muted capitalize">
                            {tratamento.status === "ativo"
                              ? "Em andamento"
                              : tratamento.status === "concluido"
                              ? "Concluído"
                              : "Suspenso"}
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
                  Alertas Inteligentes
                </h2>
              </div>
              <div className="space-y-2.5">
                {otherAlerts.map((alert: any) => (
                  <AlertRow key={`${alert.kind}-${alert.id}`} alert={alert} />
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.1 }}
            className="grid grid-cols-2 gap-2.5"
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    trigger("vibrate");
                    router.push(action.path);
                  }}
                  className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/12 text-ice">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-primary">{action.label}</p>
                    <p className="text-[10px] text-ink-muted">
                      {action.id === "consultas"
                        ? "Agenda clínica"
                        : action.id === "cirurgias"
                        ? "Procedimentos"
                        : action.id === "exames"
                        ? "Resultados e pedidos"
                        : "Estoque e gaveta"}
                    </p>
                  </div>
                </button>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.11 }}
          >
            <div className="mb-3 flex items-center gap-2">
              <FolderHeart size={15} className="text-ice" />
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Meus Arquivos
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/documentos");
                }}
                className="flex flex-col items-start gap-2 rounded-[22px] border border-ice/20 bg-gradient-to-br from-ice/5 to-surface p-4 text-left shadow-sm transition-all active:scale-[0.97] hover:border-ice/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <HeartPulse size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Saúde</p>
                  <p className="text-[10px] text-ink-muted leading-tight">
                    Receitas, laudos e exames
                  </p>
                </div>
                <ChevronRight size={16} className="text-ice/70 self-end mt-1" />
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/documentos");
                }}
                className="flex flex-col items-start gap-2 rounded-[22px] border border-ice/20 bg-gradient-to-br from-ice/5 to-surface p-4 text-left shadow-sm transition-all active:scale-[0.97] hover:border-ice/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-primary">Pessoal</p>
                  <p className="text-[10px] text-ink-muted leading-tight">
                    RGs, CNHs, contratos e certidões
                  </p>
                </div>
                <ChevronRight size={16} className="text-ice/70 self-end mt-1" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            className="rounded-[24px] border border-surface-border/50 bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Sua rede e locais
              </h2>
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/rede");
                }}
                className="text-[10px] font-medium text-ice bg-ice/10 px-3 py-1 rounded-full hover:bg-ice/20 transition-colors"
              >
                Ver rede completa →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {redeActions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(item.path);
                    }}
                    className="rounded-2xl bg-surface-raised/60 py-3 px-2 transition-all active:scale-95 hover:bg-surface-raised border border-transparent hover:border-surface-border/50 cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Icon
                      size={16}
                      className={
                        item.id === "medicos"
                          ? "text-ice"
                          : item.id === "farmacias"
                          ? "text-amber-400"
                          : item.id === "hospitais"
                          ? "text-ice"
                          : "text-emerald-400"
                      }
                    />
                    <p className="font-display text-base font-semibold text-ink-primary mt-1">
                      {item.count}
                    </p>
                    <p className="text-[10px] text-ink-muted">{item.label}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </section>

        <PendingDosesModal
          isOpen={modalPendenciasAberto}
          onClose={() => {
            trigger("vibrate");
            setModalPendenciasAberto(false);
          }}
          doses={dosesPendentesAtrasadas}
          onTomarDose={handleTomarDosePendente}
          onTomarTodas={handleTomarTodasAtrasadas}
          isProcessingDose={processandoDoseId}
          isProcessingAll={isProcessandoTudo}
          onExpand={() => {
            setModalPendenciasAberto(false);
            router.push("/hoje");
          }}
        />
      </main>
    </PageTransition>
  );
}
