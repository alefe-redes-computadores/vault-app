// app/(app)/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  Bell,
  AlertCircle,
  Shield,
  FileText,
  CalendarDays,
  ClipboardList,
  FolderLock,
  WalletCards,
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
import { VersiculoDia } from "@/components/VersiculoDia";

function isMesAtual(dataStr: string): boolean {
  if (!dataStr) return false;

  const data = new Date(dataStr);

  if (isNaN(data.getTime())) return false;

  const hoje = new Date();

  return (
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear()
  );
}

function getTratamentoIcon(nome: string) {
  const n = (nome || "").toLowerCase();

  if (n.includes("tdah")) return Brain;
  if (n.includes("dor") || n.includes("neuropática")) return Flame;
  if (n.includes("depress")) return HeartPulse;
  if (n.includes("ansied") || n.includes("ansiolítico")) return ShieldAlert;

  return Activity;
}

type DashboardAlert = {
  id: string;
  title: string;
  subtitle: string;
  level: AlertLevel;
  kind: HealthAlert["kind"];
  href: string;
  daysUntil: number;
  icon: React.ReactNode;
  color: string;
};

function AlertRow({
  alert,
}: {
  alert: DashboardAlert;
}) {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const color = alert.color;

  const isReceita =
    alert.title?.toLowerCase().includes("receita") ||
    alert.subtitle?.toLowerCase().includes("receita");

  return (
    <div
      className="flex w-full items-center justify-between gap-2 rounded-[22px] border bg-surface p-3.5 shadow-sm transition-all"
      style={{
        borderColor: `${color}30`,
      }}
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
          style={{
            backgroundColor: `${color}18`,
            color,
          }}
        >
          {alert.icon}
        </div>

        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-sm font-semibold text-ink-primary">
            {alert.title}
          </p>

          <p className="truncate text-xs text-ink-muted">
            {alert.subtitle}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{
            backgroundColor: `${color}18`,
            color,
          }}
        >
          {alertLevelLabel(alert.level, alert.daysUntil)}
        </span>

        {isReceita && (
          <button
            onClick={(event) => {
              event.stopPropagation();

              trigger("vibrate");

              router.push("/saude/renovacao/nova");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-border/50 bg-surface-raised text-ink-muted shadow-sm transition-all hover:border-emerald-400/50 hover:text-emerald-400 active:scale-95"
            title="Adicionar renovação"
          >
            <CalendarDays size={15} />
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
  const alertas: Array<{
    id: string;
    titulo: string;
    descricao: string;
    urgencia: "alta" | "media" | "baixa" | "nenhuma";
    cor: string;
    icone: React.ReactNode;
    acao: {
      rota: string;
    };
  }> = [];

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
      icone: <AlertCircle size={17} />,
      acao: {
        rota: `/saude/medicamentos/detalhes?id=${med.id}`,
      },
    });
  }

  const renovacoesVencendo = (renovacoes || []).filter((r) => {
    if (!r.proxima_renovacao) return false;

    const diff = Math.floor(
      (new Date(r.proxima_renovacao).getTime() -
        new Date(today).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return diff <= 7 && diff >= 0;
  });

  for (const ren of renovacoesVencendo) {
    const med = (medicamentos || []).find(
      (m) => m.id === ren.medicamento_id
    );

    const dias = Math.ceil(
      (new Date(ren.proxima_renovacao).getTime() -
        new Date(today).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    alertas.push({
      id: `renovacao-${ren.id}`,
      titulo: `Receita de ${med?.nome || "medicamento"}`,
      descricao:
        dias === 0
          ? "A receita vence hoje. Providencie a renovação."
          : `A receita vence em ${dias} ${dias === 1 ? "dia" : "dias"}.`,
      urgencia: dias <= 2 ? "alta" : "media",
      cor: "#F59E0B",
      icone: <Calendar size={17} />,
      acao: {
        rota: `/saude/renovacao/detalhes?id=${ren.id}`,
      },
    });
  }

  const consultasHoje = (consultas || []).filter(
    (c) => c.data === today && c.status === "agendada"
  );

  for (const consulta of consultasHoje) {
    alertas.push({
      id: `consulta-${consulta.id}`,
      titulo: `Consulta hoje com ${consulta.medico}`,
      descricao: `${consulta.especialidade} • ${
        consulta.horario || "horário não informado"
      }`,
      urgencia: "alta",
      cor: "#3B82F6",
      icone: <Stethoscope size={17} />,
      acao: {
        rota: `/saude/consultas/detalhes?id=${consulta.id}`,
      },
    });
  }

  (exames || []).forEach((exame) => {
    if (!exame.data_retorno) return;

    const diff = Math.floor(
      (new Date(exame.data_retorno).getTime() -
        new Date(today).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diff < 0) {
      alertas.push({
        id: `exame-vencido-${exame.id}`,
        titulo: `Prazo do exame "${exame.nome}" venceu`,
        descricao: "Apresente o resultado o quanto antes.",
        urgencia: "alta",
        cor: "#EF4444",
        icone: <FlaskConical size={17} />,
        acao: {
          rota: `/saude/exames/detalhes?id=${exame.id}`,
        },
      });
    } else if (diff <= 7) {
      alertas.push({
        id: `exame-proximo-${exame.id}`,
        titulo: `Exame "${exame.nome}" próximo`,
        descricao: `Apresentação prevista em ${diff} ${
          diff === 1 ? "dia" : "dias"
        }.`,
        urgencia: diff <= 2 ? "alta" : "media",
        cor: "#F59E0B",
        icone: <FlaskConical size={17} />,
        acao: {
          rota: `/saude/exames/detalhes?id=${exame.id}`,
        },
      });
    }
  });

  const ordem: Record<string, number> = {
    alta: 0,
    media: 1,
    baixa: 2,
    nenhuma: 3,
  };

  return alertas.sort(
    (a, b) => ordem[a.urgencia] - ordem[b.urgencia]
  );
}

export default function HomePage() {
  const router = useRouter();
  const { trigger } = useHapticFeedback();

  const { user, loading: authLoading } = useAuth();

  const hoje = getLocalTodayISO();

  const persons = usePersons();

  const { activePersonId } = useActivePersonId();

  const rawDocuments = useDocuments();

  const documents = useMemo(() => {
    if (!rawDocuments) return [];

    return rawDocuments.filter(
      (d: any) =>
        !activePersonId ||
        !d.person_id ||
        d.person_id === activePersonId
    );
  }, [rawDocuments, activePersonId]);

  const { medicamentos: medicamentosTodas } = useMedicamentos();

  const { medicos = [] } = useMedicos();
  const { farmacias = [] } = useFarmacias();
  const { hospitais = [] } = useHospitais();
  const { locais = [] } = useLocais();

  const {
    doseLogs,
    marcarComoTomada: marcarDose,
  } = useDoseLogs(hoje);

  const rawTratamentos =
    useLiveQuery(() => db.tratamentos.toArray(), []) || [];

  const tratamentos = useMemo(() => {
    return rawTratamentos.filter(
      (t: any) =>
        !activePersonId ||
        !t.person_id ||
        t.person_id === activePersonId
    );
  }, [rawTratamentos, activePersonId]);

  const rawCids =
    useLiveQuery(() => db.cids.toArray(), []) || [];

  const cids = useMemo(() => {
    return rawCids.filter(
      (c: any) =>
        !activePersonId ||
        !c.person_id ||
        c.person_id === activePersonId
    );
  }, [rawCids, activePersonId]);

  const rawExames =
    useLiveQuery(() => db.exames.toArray(), []) || [];

  const exames = useMemo(() => {
    return rawExames.filter(
      (e: any) =>
        (!activePersonId ||
          !e.person_id ||
          e.person_id === activePersonId) &&
        (isMesAtual(e.data ?? "") ||
          isMesAtual(e.created_at ?? ""))
    );
  }, [rawExames, activePersonId]);

  const rawRenovacoes =
    useLiveQuery(() => db.renovacoes.toArray(), []) || [];

  const renovacoes = useMemo(() => {
    return rawRenovacoes.filter(
      (r: any) =>
        (!activePersonId ||
          !r.person_id ||
          r.person_id === activePersonId) &&
        (isMesAtual(r.data ?? "") ||
          isMesAtual(r.created_at ?? ""))
    );
  }, [rawRenovacoes, activePersonId]);

  const rawConsultas =
    useLiveQuery(() => db.consultas.toArray(), []) || [];

  const consultas = useMemo(() => {
    return rawConsultas.filter(
      (c: any) =>
        (!activePersonId ||
          !c.person_id ||
          c.person_id === activePersonId) &&
        (isMesAtual(c.data ?? "") ||
          isMesAtual(c.created_at ?? ""))
    );
  }, [rawConsultas, activePersonId]);

  const rawCirurgias =
    useLiveQuery(() => db.cirurgias.toArray(), []) || [];

  const cirurgias = useMemo(() => {
    return rawCirurgias.filter(
      (cir: any) =>
        (!activePersonId ||
          !cir.person_id ||
          cir.person_id === activePersonId) &&
        (isMesAtual(cir.data ?? "") ||
          isMesAtual(cir.created_at ?? ""))
    );
  }, [rawCirurgias, activePersonId]);

  const activePerson = useMemo(() => {
    return (
      persons.find((p) => p.id === activePersonId) ||
      persons[0] ||
      null
    );
  }, [persons, activePersonId]);

  const displayName =
    activePerson?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuário";

  const avatarUrl =
    activePerson?.avatar_url ||
    user?.user_metadata?.avatar_url;

  const medicamentos = useMemo(
    () =>
      (medicamentosTodas || []).filter(
        (m: any) =>
          !activePersonId ||
          !m.person_id ||
          m.person_id === activePersonId
      ),
    [medicamentosTodas, activePersonId]
  );

  const consultasHoje = useMemo(
    () => consultas.filter((c: any) => c.data === hoje),
    [consultas, hoje]
  );

  const examesHoje = useMemo(
    () => exames.filter((e: any) => e.data === hoje),
    [exames, hoje]
  );

  const cirurgiasHoje = useMemo(
    () => cirurgias.filter((c: any) => c.data === hoje),
    [cirurgias, hoje]
  );

  const [modalPendenciasAberto, setModalPendenciasAberto] =
    useState(false);

  const [processandoDoseId, setProcessandoDoseId] =
    useState<string | null>(null);

  const [isProcessandoTudo, setIsProcessandoTudo] =
    useState(false);

  const horaAtual = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const metricasFinanceiras = useMemo(() => {
    const dataAtual = new Date();

    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();

    const mesAnterior =
      mesAtual === 0 ? 11 : mesAtual - 1;

    const anoDoMesAnterior =
      mesAtual === 0 ? anoAtual - 1 : anoAtual;

    let gastoMesAtual = 0;
    let gastoMesAnterior = 0;

    (rawRenovacoes || []).forEach((r: any) => {
      if (
        activePersonId &&
        r.person_id &&
        r.person_id !== activePersonId
      ) {
        return;
      }

      const precoNumerico = Number(r.preco);

      if (
        !isNaN(precoNumerico) &&
        precoNumerico > 0 &&
        r.data
      ) {
        let dataR = new Date(r.data);

        if (
          isNaN(dataR.getTime()) &&
          r.data.includes("/")
        ) {
          const partes = r.data.split("/");

          if (partes.length === 3) {
            dataR = new Date(
              `${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`
            );
          }
        }

        if (!isNaN(dataR.getTime())) {
          if (
            dataR.getMonth() === mesAtual &&
            dataR.getFullYear() === anoAtual
          ) {
            gastoMesAtual += precoNumerico;
          } else if (
            dataR.getMonth() === mesAnterior &&
            dataR.getFullYear() === anoDoMesAnterior
          ) {
            gastoMesAnterior += precoNumerico;
          }
        }
      }
    });

    medicamentos.forEach((m: any) => {
      const custoIni = Number(m.preco || 0);

      if (custoIni > 0 && m.created_at) {
        const dataM = new Date(m.created_at);

        if (!isNaN(dataM.getTime())) {
          if (
            dataM.getMonth() === mesAtual &&
            dataM.getFullYear() === anoAtual
          ) {
            gastoMesAtual += custoIni;
          } else if (
            dataM.getMonth() === mesAnterior &&
            dataM.getFullYear() === anoDoMesAnterior
          ) {
            gastoMesAnterior += custoIni;
          }
        }
      }
    });

    return {
      gastoMesAtual,
      gastoMesAnterior,
      diff: gastoMesAtual - gastoMesAnterior,
    };
  }, [
    rawRenovacoes,
    medicamentos,
    activePersonId,
  ]);

  const dosesPendentesAtrasadas = useMemo(() => {
    if (!medicamentos || !doseLogs) return [];

    const lista: Array<{
      medicamentoId: string;
      nome: string;
      horario: string;
    }> = [];

    for (const med of medicamentos) {
      if (
        !med.id ||
        med.status === "descontinuado" ||
        !med.estoque_horarios
      ) {
        continue;
      }

      for (const horario of med.estoque_horarios) {
        if (!horario || horario > horaAtual) continue;

        const log = doseLogs.find(
          (l) =>
            l.medicamento_id === med.id &&
            l.horario === horario
        );

        if (!log?.tomado_em) {
          lista.push({
            medicamentoId: med.id,
            nome: med.nome,
            horario,
          });
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
  }, [
    medicamentos,
    renovacoes,
    consultas,
    exames,
    hoje,
  ]);

  const alertasEstoque = useMemo<HealthAlert[]>(() => {
    if (!medicamentos) return [];

    const alerts: HealthAlert[] = [];

    medicamentos.forEach((m) => {
      if (
        m.status === "descontinuado" ||
        !m.id
      ) {
        return;
      }

      const insight = sugerirRenovacao(m);

      if (insight.deveRenovar) {
        const alertLvl: AlertLevel =
          insight.urgencia === "alta"
            ? "urgente"
            : "atencao";

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
      new Set(
        (consultas || [])
          .map((c: any) => c.medico_id)
          .filter(Boolean)
      )
    );

    const alertas: HealthAlert[] = [];

    medicosUnicosIds.forEach((medicoId) => {
      if (!medicoId) return;

      const consMedico = (consultas || []).filter(
        (c: any) => c.medico_id === medicoId
      );

      const consFuturas = consMedico.filter(
        (c: any) => c.data >= hoje
      );

      if (consFuturas.length === 0) {
        const ultimaCons = [...consMedico].sort(
          (a: any, b: any) =>
            b.data.localeCompare(a.data)
        )[0];

        if (ultimaCons) {
          const diffDias = Math.floor(
            (new Date(hoje).getTime() -
              new Date(ultimaCons.data).getTime()) /
              (1000 * 3600 * 24)
          );

          if (diffDias > 180) {
            alertas.push({
              id: `cons-${medicoId}`,
              title: `Dr(a). ${ultimaCons.medico}`,
              subtitle: `Sem retorno médico há ${Math.floor(
                diffDias / 30
              )} meses`,
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
    () =>
      getDocumentAlerts(documents || []).filter(
        (a) => a.daysUntil <= 5
      ),
    [documents]
  );

  const exameAlerts = useMemo(
    () =>
      getExameAlerts(exames || []).filter(
        (a: any) => a.daysUntil <= 5
      ),
    [exames]
  );

  /*
   * Unificamos os diferentes mecanismos de alerta
   * em uma única lista visual.
   */
  const unifiedAlerts = useMemo<DashboardAlert[]>(() => {
    const alerts: DashboardAlert[] = [];

    for (const alert of alertasAgrupados) {
      alerts.push({
        id: alert.id,
        title: alert.titulo,
        subtitle: alert.descricao,
                level:
          alert.urgencia === "alta"
            ? "urgente"
            : alert.urgencia === "media"
            ? "atencao"
            : ("informativo" as AlertLevel),
        kind: "estoque",
        href: alert.acao.rota,
        daysUntil:
          alert.urgencia === "alta"
            ? 0
            : 3,
        icon: alert.icone,
        color: alert.cor,
      });
    }

    const secondaryAlerts = [
      ...docAlerts,
      ...exameAlerts,
      ...alertasEstoque,
      ...alertasConsultas,
    ];

    for (const alert of secondaryAlerts) {
      let icon: React.ReactNode;

      if (alert.kind === "exame") {
        icon = <FlaskConical size={17} />;
      } else if (alert.kind === "consulta") {
        icon = <Stethoscope size={17} />;
      } else {
        icon = <FileWarning size={17} />;
      }

      alerts.push({
        id: `${alert.kind}-${alert.id}`,
        title: alert.title,
        subtitle: alert.subtitle,
        level: alert.level,
        kind: alert.kind,
        href: alert.href,
        daysUntil: alert.daysUntil,
        icon,
        color: alertLevelColor(alert.level),
      });
    }

    const unique = new Map<string, DashboardAlert>();

    for (const alert of alerts) {
      if (!unique.has(alert.id)) {
        unique.set(alert.id, alert);
      }
    }

    const levelOrder: Record<string, number> = {
      urgente: 0,
      vencido: 0,
      atencao: 1,
      informativo: 2,
    };

    return Array.from(unique.values())
      .sort(
        (a, b) =>
          (levelOrder[a.level] ?? 3) -
          (levelOrder[b.level] ?? 3)
      )
      .slice(0, 6);
  }, [
    alertasAgrupados,
    docAlerts,
    exameAlerts,
    alertasEstoque,
    alertasConsultas,
  ]);

  const quickActions = [
    {
      id: "consultas",
      label: "Consultas",
      description: "Agenda clínica",
      icon: Calendar,
      path: "/saude/consultas",
    },
    {
      id: "exames",
      label: "Exames",
      description: "Resultados e pedidos",
      icon: FlaskConical,
      path: "/saude/exames",
    },
    {
      id: "medicamentos",
      label: "Medicamentos",
      description: "Estoque e doses",
      icon: Pill,
      path: "/saude/medicamentos",
    },
    {
      id: "prontuario",
      label: "Prontuário",
      description: "Sintomas e medições",
      icon: Activity,
      path: "/saude/registros",
    },
  ];

  const redeActions = [
    {
      id: "medicos",
      label: "Médicos",
      icon: Stethoscope,
      path: "/saude/medicos",
      count: medicos?.length || 0,
    },
    {
      id: "farmacias",
      label: "Farmácias",
      icon: Pill,
      path: "/saude/farmacias",
      count: farmacias?.length || 0,
    },
    {
      id: "hospitais",
      label: "Hospitais",
      icon: Building2,
      path: "/saude/hospitais",
      count: hospitais?.length || 0,
    },
    {
      id: "locais",
      label: "Postos",
      icon: MapPin,
      path: "/saude/locais",
      count: locais?.length || 0,
    },
    {
      id: "cids",
      label: "CIDs",
      icon: FileText,
      path: "/saude/cids",
      count: cids?.length || 0,
    },
  ];

  const totalCompromissosHoje =
    consultasHoje.length +
    examesHoje.length +
    cirurgiasHoje.length;

  // 🔥 CORREÇÃO: Unificação do contador para somar tanto as tomadas programadas quanto as doses avulsas / SOS
  const dosesTomadasHoje = useMemo(() => {
    if (!doseLogs || !medicamentos) return 0;

    const chavesProgramadas = new Set<string>();
    for (const med of medicamentos) {
      if (!med.id || !med.estoque_horarios) continue;
      for (const h of med.estoque_horarios) {
        if (h) chavesProgramadas.add(`${med.id}-${h}`);
      }
    }

    let contador = 0;
    for (const log of doseLogs) {
      if (!log.tomado_em) continue;
      const chave = `${log.medicamento_id}-${log.horario}`;
      // Se for programada ou avulsa/SOS, conta como tomada no dia
      if (chavesProgramadas.has(chave) || (log.medicamento_id && log.horario)) {
        contador++;
      }
    }
    return contador;
  }, [doseLogs, medicamentos]);

  const medicamentosAtivos = useMemo(
    () =>
      medicamentos.filter(
        (m: any) =>
          m.status === "ativo" &&
          m.status !== "descontinuado"
      ),
    [medicamentos]
  );

  const handleTomarDosePendente = async (d: {
    medicamentoId: string;
    nome: string;
    horario: string;
  }) => {
    if (processandoDoseId) return;

    setProcessandoDoseId(
      `${d.medicamentoId}-${d.horario}`
    );

    trigger("success");

    try {
      await marcarDose(
        d.medicamentoId,
        hoje,
        d.horario
      );

      const medOriginal = medicamentos.find(
        (m) => m.id === d.medicamentoId
      );

      if (
        medOriginal &&
        typeof medOriginal.estoque_quantidade ===
          "number"
      ) {
        const unidadePorDose =
          medOriginal.estoque_unidade_por_dose || 1;

        const novoEstoque = Math.max(
          0,
          medOriginal.estoque_quantidade -
            unidadePorDose
        );

        await safeUpdateMedicamento(
          d.medicamentoId,
          {
            estoque_quantidade: novoEstoque,
            estoque_data_referencia: hoje,
          }
        );
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
        await marcarDose(
          d.medicamentoId,
          hoje,
          d.horario
        );

        const medOriginal = medicamentos.find(
          (m) => m.id === d.medicamentoId
        );

        if (
          medOriginal &&
          typeof medOriginal.estoque_quantidade ===
            "number"
        ) {
          const unidadePorDose =
            medOriginal.estoque_unidade_por_dose || 1;

          const novoEstoque = Math.max(
            0,
            medOriginal.estoque_quantidade -
              unidadePorDose
          );

          await safeUpdateMedicamento(
            d.medicamentoId,
            {
              estoque_quantidade: novoEstoque,
              estoque_data_referencia: hoje,
            }
          );
        }
      }

      setModalPendenciasAberto(false);
    } finally {
      setIsProcessandoTudo(false);
    }
  };

  const isLoading =
    authLoading ||
    documents === undefined ||
    medicamentosTodas === undefined ||
    exames === undefined;

  if (isLoading) {
    return <SimpleSpinner />;
  }

  return (
    <PageTransition>
      <main className="min-h-screen overflow-y-auto bg-void pb-40">
        {/* =========================================================
            HEADER
        ========================================================= */}

        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/82 px-5 pb-4 pt-safe backdrop-blur-xl">
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
            }}
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
                <span className="glow-ice flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
              ) : (
                <div className="ring-gradient glow-ice flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-void">
                  {displayName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ice/90">
                  Painel Clínico
                </p>

                <h1 className="mt-1 truncate font-display text-base font-semibold text-ink-primary">
                  Olá,{" "}
                  {displayName.split(" ")[0]}
                </h1>

                <p className="text-xs text-ink-muted">
                  {dosesPendentesAtrasadas.length >
                  0
                    ? `${dosesPendentesAtrasadas.length} pendência${
                        dosesPendentesAtrasadas.length >
                        1
                          ? "s"
                          : ""
                      } para hoje`
                    : "Tudo atualizado"}
                </p>
              </div>
            </button>
          </motion.div>
        </header>

        <section className="space-y-6 px-5 pt-5">
          {/* =========================================================
              RESUMO DE HOJE
          ========================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.02,
            }}
            className="overflow-hidden rounded-[28px] border border-ice/20 bg-gradient-to-br from-ice/10 via-surface to-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <CalendarDays
                    size={15}
                    className="text-ice"
                  />

                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ice">
                    Resumo de hoje
                  </p>
                </div>

                <p className="font-display text-lg font-semibold text-ink-primary">
                  Seu dia clínico
                </p>

                <p className="mt-1 text-xs text-ink-muted">
                  Acompanhe compromissos,
                  medicações e pendências.
                </p>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10 text-ice">
                <HeartPulse size={20} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/hoje");
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <Calendar
                    size={15}
                    className="text-ice"
                  />

                  <span className="text-[10px] text-ink-muted">
                    Compromissos
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {totalCompromissosHoje}
                </p>
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/medicamentos");
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <Pill
                    size={15}
                    className="text-emerald-400"
                  />

                  <span className="text-[10px] text-ink-muted">
                    Medicamentos ativos
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {medicamentosAtivos.length}
                </p>
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");
                  setModalPendenciasAberto(true);
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <Clock
                    size={15}
                    className={
                      dosesPendentesAtrasadas.length >
                      0
                        ? "text-coral"
                        : "text-emerald-400"
                    }
                  />

                  <span className="text-[10px] text-ink-muted">
                    Doses pendentes
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {dosesPendentesAtrasadas.length}
                </p>
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/hoje");
                }}
                className="rounded-2xl border border-surface-border/50 bg-surface-raised/60 p-3 text-left transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList
                    size={15}
                    className="text-violet-400"
                  />

                  <span className="text-[10px] text-ink-muted">
                    Doses tomadas
                  </span>
                </div>

                <p className="mt-1 font-mono text-lg font-bold text-ink-primary">
                  {dosesTomadasHoje}
                </p>
              </button>
            </div>

            <button
              onClick={() => {
                trigger("vibrate");
                router.push("/hoje");
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-ice/20 bg-ice/10 px-4 py-3 text-xs font-semibold text-ice transition-all hover:bg-ice/15 active:scale-[0.985]"
            >
              Ver meu dia
              <ChevronRight size={15} />
            </button>
          </motion.section>

{/*        =========================================================
              ATENÇÃO (Carrossel Horizontal)
          ========================================================= */}
          {unifiedAlerts.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.04 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral/10 text-coral">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-semibold text-ink-primary">
                      Atenção
                    </h2>
                    <p className="text-[10px] text-ink-muted">
                      Itens que merecem sua atenção
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-coral/10 px-2.5 py-1 text-[10px] font-semibold text-coral">
                  {unifiedAlerts.length}
                </span>
              </div>

              <div
                className="-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-4 gap-3 scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {unifiedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="w-[85%] max-w-[320px] shrink-0 snap-start"
                  >
                    <AlertRow alert={alert} />
                  </div>
                ))}
                {/* Espaçador final */}
                <div className="w-2 shrink-0" />
              </div>
            </motion.section>
          )}

          {/* =     =========================================================
              COMPROMISSOS DE HOJE (Carrossel Horizontal)
          ========================================================= */}
          {totalCompromissosHoje > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.06 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ice/10 text-ice">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-semibold text-ink-primary">
                      Hoje
                    </h2>
                    <p className="text-[10px] text-ink-muted">
                      Seus compromissos clínicos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    trigger("vibrate");
                    router.push("/hoje");
                  }}
                  className="text-[10px] font-semibold text-ice"
                >
                  Ver agenda
                </button>
              </div>

              <div
                className="-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-4 gap-3 scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {consultasHoje.map((consulta: any) => (
                  <div key={consulta.id} className="w-[85%] max-w-[320px] shrink-0 snap-start">
                    <button onClick={() => { trigger("vibrate"); router.push(`/saude/consultas/detalhes?id=${consulta.id}`); }} className="flex w-full items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:border-ice/30">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ice/10 text-ice">
                        <Stethoscope size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-primary">{consulta.especialidade || "Consulta"}</p>
                        <p className="truncate text-[11px] text-ink-muted">Dr(a). {consulta.medico || "não informado"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs font-bold text-coral">{consulta.horario || "Hoje"}</p>
                        <ChevronRight size={14} className="ml-auto mt-1 text-ink-faint" />
                      </div>
                    </button>
                  </div>
                ))}

                {cirurgiasHoje.map((cirurgia: any) => (
                  <div key={cirurgia.id} className="w-[85%] max-w-[320px] shrink-0 snap-start">
                    <button onClick={() => { trigger("vibrate"); router.push(`/saude/cirurgias/detalhes?id=${cirurgia.id}`); }} className="flex w-full items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:border-violet-400/30">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-400">
                        <Activity size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-primary">{cirurgia.procedimento || "Cirurgia"}</p>
                        <p className="text-[11px] text-ink-muted">Procedimento agendado</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs font-bold text-coral">Hoje</p>
                        <ChevronRight size={14} className="ml-auto mt-1 text-ink-faint" />
                      </div>
                    </button>
                  </div>
                ))}

                {examesHoje.map((exame: any) => (
                  <div key={exame.id} className="w-[85%] max-w-[320px] shrink-0 snap-start">
                    <button onClick={() => { trigger("vibrate"); router.push(`/saude/exames/detalhes?id=${exame.id}`); }} className="flex w-full items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:border-emerald-400/30">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                        <FlaskConical size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-primary">{exame.nome || "Exame"}</p>
                        <p className="text-[11px] text-ink-muted">Exame para hoje</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs font-bold text-coral">Hoje</p>
                        <ChevronRight size={14} className="ml-auto mt-1 text-ink-faint" />
                      </div>
                    </button>
                  </div>
                ))}
                <div className="w-2 shrink-0" />
              </div>
            </motion.section>
          )}


          {/* =========================================================
              MEDICAMENTOS
          ========================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.08,
            }}
            className="rounded-[26px] border border-surface-border/50 bg-surface p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <Pill size={19} />
                </div>

                <div>
                  <h2 className="font-display text-sm font-semibold text-ink-primary">
                    Medicamentos
                  </h2>

                  <p className="text-[10px] text-ink-muted">
                    Acompanhamento das doses
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push(
                    "/saude/medicamentos"
                  );
                }}
                className="text-[10px] font-semibold text-ice"
              >
                Ver todos
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/60 p-3">
                <p className="text-[10px] text-ink-muted">
                  Ativos
                </p>

                <p className="mt-1 font-mono text-xl font-bold text-ink-primary">
                  {medicamentosAtivos.length}
                </p>

                <p className="mt-1 text-[10px] text-ink-muted">
                  medicamentos
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 ${
                  dosesPendentesAtrasadas.length >
                  0
                    ? "border-coral/20 bg-coral/5"
                    : "border-emerald-400/20 bg-emerald-400/5"
                }`}
              >
                <p className="text-[10px] text-ink-muted">
                  Pendentes
                </p>

                <p
                  className={`mt-1 font-mono text-xl font-bold ${
                    dosesPendentesAtrasadas.length >
                    0
                      ? "text-coral"
                      : "text-emerald-400"
                  }`}
                >
                  {dosesPendentesAtrasadas.length}
                </p>

                <p className="mt-1 text-[10px] text-ink-muted">
                  doses hoje
                </p>
              </div>
            </div>

            {dosesPendentesAtrasadas.length >
              0 && (
              <button
                onClick={() => {
                  trigger("vibrate");
                  setModalPendenciasAberto(true);
                }}
                className="mt-3 flex w-full items-center justify-between rounded-2xl border border-coral/20 bg-coral/5 px-3.5 py-3 text-left transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-2.5">
                  <Clock
                    size={16}
                    className="text-coral"
                  />

                  <div>
                    <p className="text-xs font-semibold text-ink-primary">
                      Existem doses pendentes
                    </p>

                    <p className="text-[10px] text-ink-muted">
                      Gerencie as doses atrasadas
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="text-coral"
                />
              </button>
            )}
          </motion.section>

          {/* =========================================================
              NOTIFICAÇÕES
          ========================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.1,
            }}
            className="space-y-4"
          >
            <HealthNotifications />

            <MedicamentosNotifications />
          </motion.section>

{/* =========================================================
              TRATAMENTOS (Carrossel Horizontal)
          ========================================================= */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.12 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                  <FolderHeart size={16} />
                </div>
                <div>
                  <h2 className="font-display text-sm font-semibold text-ink-primary">
                    Tratamentos ativos
                  </h2>
                  <p className="text-[10px] text-ink-muted">
                    Condições em acompanhamento
                  </p>
                </div>
              </div>

              {tratamentos.length > 0 && (
                <button
                  onClick={() => {
                    trigger("vibrate");
                    router.push("/saude/tratamentos");
                  }}
                  className="text-[10px] font-semibold text-ice"
                >
                  Ver todos
                </button>
              )}
            </div>

            {tratamentos.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-surface-border/60 bg-surface/40 px-4 py-6 text-center">
                <FolderHeart size={22} className="mx-auto mb-2 text-ink-faint" />
                <p className="text-sm text-ink-muted">
                  Nenhum tratamento cadastrado.
                </p>
              </div>
            ) : (
              <div
                className="-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-4 gap-3 scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {tratamentos.map((tratamento: any) => {
                  const IconComponent = getTratamentoIcon(tratamento.nome);
                  const cor = tratamento.cor || "#8B5CF6";
                  return (
                    <div
                      key={tratamento.id}
                      className="w-[85%] max-w-[320px] shrink-0 snap-start"
                    >
                      <button
                        onClick={() => {
                          trigger("vibrate");
                          router.push(
                            `/saude/tratamentos/detalhes?id=${tratamento.id}`
                          );
                        }}
                        className="flex w-full items-center justify-between overflow-hidden rounded-[22px] border bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
                        style={{
                          borderColor: `${cor}30`,
                          borderLeftWidth: 4,
                          borderLeftColor: cor,
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor: `${cor}15`,
                              color: cor,
                            }}
                          >
                            <IconComponent size={19} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-primary">
                              {tratamento.nome}
                            </p>
                            <p className="truncate text-[11px] text-ink-muted">
                              {tratamento.status === "ativo"
                                ? "Em andamento"
                                : tratamento.status === "concluido"
                                ? "Concluído"
                                : "Suspenso"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="shrink-0 text-ink-faint"
                        />
                      </button>
                    </div>
                  );
                })}
                <div className="w-2 shrink-0" />
              </div>
            )}
          </motion.section>


          {/* =========================================================
              ACESSO RÁPIDO
          ========================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.14,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList
                size={15}
                className="text-ice"
              />

              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Acesso rápido
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(action.path);
                    }}
                    className="flex items-center gap-3 rounded-[22px] border border-surface-border/50 bg-surface p-3.5 text-left shadow-sm transition-all active:scale-[0.985] hover:bg-surface-raised/80"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ice/10 text-ice">
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-primary">
                        {action.label}
                      </p>

                      <p className="truncate text-[10px] text-ink-muted">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* =========================================================
              PRONTUÁRIO
          ========================================================= */}

          <motion.button
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.16,
            }}
            onClick={() => {
              trigger("vibrate");
              router.push("/saude/registros");
            }}
            className="flex w-full items-center justify-between rounded-[24px] border border-ice/20 bg-gradient-to-r from-ice/10 to-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:border-ice/40"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ice/20 bg-ice/10 text-ice">
                <Activity size={21} />
              </div>

              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-ink-primary">
                  Prontuário de sintomas e medições
                </p>

                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  Acompanhe dores, pressões e
                  evoluções
                </p>
              </div>
            </div>

            <ChevronRight
              size={18}
              className="shrink-0 text-ice"
            />
          </motion.button>

          {/* =========================================================
              VERSÍCULO
          ========================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.18,
            }}
          >
            <VersiculoDia />
          </motion.section>

          {/* =========================================================
              MEUS ARQUIVOS
          ========================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.2,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <FolderHeart
                size={15}
                className="text-ice"
              />

              <h2 className="font-display text-sm font-semibold text-ink-primary">
                Meus arquivos
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push(
                    "/saude/documentos"
                  );
                }}
                className="flex flex-col items-start gap-2 rounded-[22px] border border-ice/20 bg-gradient-to-br from-ice/5 to-surface p-4 text-left shadow-sm transition-all active:scale-[0.97] hover:border-ice/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400">
                  <FolderHeart size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    Saúde
                  </p>

                  <p className="text-[10px] leading-tight text-ink-muted">
                    Receitas, laudos e exames
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="mt-1 self-end text-ice/70"
                />
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/documentos");
                }}
                className="flex flex-col items-start gap-2 rounded-[22px] border border-ice/20 bg-gradient-to-br from-ice/5 to-surface p-4 text-left shadow-sm transition-all active:scale-[0.97] hover:border-ice/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ice/10 text-ice">
                  <FolderLock size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-ink-primary">
                    Pessoal
                  </p>

                  <p className="text-[10px] leading-tight text-ink-muted">
                    RGs, CNHs, contratos e
                    certidões
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  className="mt-1 self-end text-ice/70"
                />
              </button>
            </div>
          </motion.section>

          {/* =========================================================
              RESUMO FINANCEIRO
          ========================================================= */}

          <motion.button
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.22,
            }}
            onClick={() => {
              trigger("vibrate");
              router.push(
                "/saude/renovacao"
              );
            }}
            className="flex w-full items-center justify-between rounded-[24px] border border-surface-border/50 bg-surface p-4 text-left shadow-sm transition-all active:scale-[0.985] hover:border-emerald-400/30"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <WalletCards size={21} />
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-muted">
                  Gastos com saúde
                </p>

                <p className="mt-0.5 font-mono text-lg font-bold text-ink-primary">
                  R${" "}
                  {metricasFinanceiras.gastoMesAtual
                    .toFixed(2)
                    .replace(".", ",")}
                </p>

                {metricasFinanceiras.diff !==
                  0 && (
                  <p
                    className={`mt-0.5 text-[10px] font-bold ${
                      metricasFinanceiras.diff >
                      0
                        ? "text-coral"
                        : "text-emerald-400"
                    }`}
                  >
                    {metricasFinanceiras.diff >
                    0
                      ? "+"
                      : "-"}{" "}
                    R${" "}
                    {Math.abs(
                      metricasFinanceiras.diff
                    )
                      .toFixed(2)
                      .replace(".", ",")}{" "}
                    vs. mês passado
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-ice">
              <span>Histórico</span>
              <ChevronRight size={15} />
            </div>
          </motion.button>

          {/* =========================================================
              REDE
          ========================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.24,
              delay: 0.24,
            }}
            className="rounded-[24px] border border-surface-border/50 bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-ink-primary">
                  Sua rede
                </h2>

                <p className="mt-0.5 text-[10px] text-ink-muted">
                  Profissionais e locais salvos
                </p>
              </div>

              <button
                onClick={() => {
                  trigger("vibrate");
                  router.push("/saude/rede");
                }}
                className="rounded-full bg-ice/10 px-3 py-1.5 text-[10px] font-medium text-ice transition-colors hover:bg-ice/20"
              >
                Ver rede completa
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {redeActions.map((item) => {
                const Icon = item.icon;

                const iconClass =
                  item.id === "medicos"
                    ? "text-ice"
                    : item.id ===
                      "farmacias"
                    ? "text-amber-400"
                    : item.id ===
                      "hospitais"
                    ? "text-ice"
                    : item.id === "cids"
                    ? "text-violet-400"
                    : "text-emerald-400";

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      trigger("vibrate");
                      router.push(item.path);
                    }}
                    className="flex min-h-[82px] flex-col items-center justify-center rounded-2xl border border-transparent bg-surface-raised/60 px-2 py-3 transition-all active:scale-95 hover:border-surface-border/50 hover:bg-surface-raised"
                  >
                    <Icon
                      size={17}
                      className={iconClass}
                    />

                    <p className="mt-1 font-display text-base font-semibold text-ink-primary">
                      {item.count}
                    </p>

                    <p className="text-[10px] text-ink-muted">
                      {item.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.section>
        </section>

        {/* =========================================================
            MODAL DE DOSES
        ========================================================= */}

        <PendingDosesModal
          isOpen={modalPendenciasAberto}
          onClose={() => {
            trigger("vibrate");
            setModalPendenciasAberto(false);
          }}
          doses={dosesPendentesAtrasadas}
          onTomarDose={
            handleTomarDosePendente
          }
          onTomarTodas={
            handleTomarTodasAtrasadas
          }
          isProcessingDose={
            processandoDoseId
          }
          isProcessingAll={
            isProcessandoTudo
          }
          onExpand={() => {
            setModalPendenciasAberto(false);
            router.push("/hoje");
          }}
        />
      </main>
    </PageTransition>
  );
}
