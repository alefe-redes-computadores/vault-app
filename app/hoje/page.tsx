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
  FileWarning,
  AlertOctagon,
  Info,
  Activity,
  Sun,
  Moon,
  Sunrise,
  Zap,
  Trash2,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { useDoseLogs } from "@/hooks/useDoseLogs";
import { useHapticFeedback } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import { CardListSkeleton } from "@/components/loading/CardListSkeleton";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  safeAddRenovacao,
  safeUpdateMedicamento,
} from "@/lib/db";
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
type FiltroCompromisso =
  | "todos"
  | "consultas"
  | "cirurgias"
  | "exames";

function getPeriodoDoDia(horario: string) {
  const safeHorario = horario || "00:00";
  const [h] = safeHorario.split(":").map(Number);

  if (h >= 5 && h < 12) {
    return {
      key: "manha",
      label: "Manhã",
      sub: "Comece o dia com foco",
      icon: Sunrise,
    };
  }

  if (h >= 12 && h < 18) {
    return {
      key: "tarde",
      label: "Tarde",
      sub: "Manutenção e constância",
      icon: Sun,
    };
  }

  return {
    key: "noite",
    label: "Noite",
    sub: "Encerramento e descanso",
    icon: Moon,
  };
}

function getDiasRestantesEstilo(
  dias: number | null | undefined
) {
  if (dias === null || dias === undefined) {
    return {
      cor: "text-ink-muted",
      bg: "bg-surface",
      label: "Indefinido",
      pulse: false,
    };
  }

  if (dias <= 3) {
    return {
      cor: "text-coral",
      bg: "bg-coral/10",
      label: "Urgente",
      pulse: true,
    };
  }

  if (dias <= 7) {
    return {
      cor: "text-amber-400",
      bg: "bg-amber-400/10",
      label: "Em breve",
      pulse: false,
    };
  }

  if (dias <= 14) {
    return {
      cor: "text-amber-300",
      bg: "bg-amber-300/5",
      label: "Atenção",
      pulse: false,
    };
  }

  return {
    cor: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Tranquilo",
    pulse: false,
  };
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
  insight?: {
    deveRenovar: boolean;
    mensagem: string;
    urgencia: "alta" | "media" | "nenhuma";
  };
  receitaVencida?: boolean;
  comportamento?: any;
  isAvulsa?: boolean;
  motivoAvulsa?: string;
  logId?: string;
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
  const { activePersonId } = useActivePersonId();

  const hoje = getLocalTodayISO();

  const {
    medicamentos: rawMedicamentos,
  } = useMedicamentos();

  const medicamentos = useMemo(() => {
    if (!rawMedicamentos) return [];

    return rawMedicamentos.filter(
      (m: any) =>
        !activePersonId ||
        !m.person_id ||
        m.person_id === activePersonId
    );
  }, [rawMedicamentos, activePersonId]);

  const {
    doseLogs,
    marcarComoTomada: marcarDose,
    marcarComoIgnorada,
    desmarcarDose,
    removerDosePorId,
  } = useDoseLogs(hoje);

  const tratamentos =
    useLiveQuery(
      () =>
        activePersonId
          ? db.tratamentos
              .where("person_id")
              .equals(activePersonId)
              .toArray()
          : db.tratamentos.toArray(),
      [activePersonId]
    ) || [];

  const medicos = useLiveQuery(
    () => db.medicos.toArray(),
    []
  ) || [];

  const farmacias = useLiveQuery(
    () => db.farmacias.toArray(),
    []
  ) || [];

  const hospitais = useLiveQuery(
    () => db.hospitais.toArray(),
    []
  ) || [];

  const rawConsultas =
    useLiveQuery(
      () => db.consultas.toArray(),
      []
    ) || [];

  const consultas = useMemo(
    () =>
      rawConsultas.filter(
        (c: any) =>
          !activePersonId ||
          !c.person_id ||
          c.person_id === activePersonId
      ),
    [rawConsultas, activePersonId]
  );

  const rawCirurgias =
    useLiveQuery(
      () => db.cirurgias.toArray(),
      []
    ) || [];

  const cirurgias = useMemo(
    () =>
      rawCirurgias.filter(
        (c: any) =>
          !activePersonId ||
          !c.person_id ||
          c.person_id === activePersonId
      ),
    [rawCirurgias, activePersonId]
  );

  const rawExames =
    useLiveQuery(
      () => db.exames.toArray(),
      []
    ) || [];

  const exames = useMemo(
    () =>
      rawExames.filter(
        (e: any) =>
          !activePersonId ||
          !e.person_id ||
          e.person_id === activePersonId
      ),
    [rawExames, activePersonId]
  );

  const rawRegistrosSaude =
    useLiveQuery(
      () => db.table("registros_saude").toArray(),
      []
    ) || [];

  const registrosHoje = useMemo(() => {
    return rawRegistrosSaude.filter((r: any) => {
      const matchPerson =
        !activePersonId ||
        !r.person_id ||
        r.person_id === activePersonId;

      const matchDate = r.data === hoje;

      return matchPerson && matchDate;
    });
  }, [rawRegistrosSaude, activePersonId, hoje]);

  const consultasHoje = useMemo(
    () =>
      consultas.filter(
        (c: any) => c.data === hoje
      ),
    [consultas, hoje]
  );

  const cirurgiasHoje = useMemo(
    () =>
      cirurgias.filter(
        (c: any) => c.data === hoje
      ),
    [cirurgias, hoje]
  );

  const examesHoje = useMemo(
    () =>
      exames.filter(
        (e: any) => e.data === hoje
      ),
    [exames, hoje]
  );

  const [filtroStatus, setFiltroStatus] =
    useState<FiltroStatus>("todos");

  const [filtroPeriodo, setFiltroPeriodo] =
    useState<FiltroPeriodo>("todos");

  const [filtroCompromisso, setFiltroCompromisso] =
    useState<FiltroCompromisso>("todos");

  const [modalAberto, setModalAberto] =
    useState(false);

  const [
    medicamentoSelecionado,
    setMedicamentoSelecionado,
  ] = useState<any>(null);

  const [precoRenovacao, setPrecoRenovacao] =
    useState("");

  const [
    observacoesRenovacao,
    setObservacoesRenovacao,
  ] = useState("");

  const [
    adicionarMaisEstoque,
    setAdicionarMaisEstoque,
  ] = useState(30);

  const [
    processandoDoseId,
    setProcessandoDoseId,
  ] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [isDoseModalOpen, setIsDoseModalOpen] =
    useState(false);

  useEffect(() => {
    const action = searchParams.get("action");

    if (action === "dose") {
      setIsDoseModalOpen(true);
      router.replace("/hoje");
    } else if (action === "sintoma") {
      router.replace("/saude/registros/novo");
    }
  }, [searchParams, router]);

  const historicoDosesCompleto =
    useLiveQuery(
      () => db.doseLogs.toArray(),
      []
    ) || [];

  const horaAtual = new Date().toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const doses = useMemo<DoseItemExt[]>(() => {
    const list: DoseItemExt[] = [];
    const chavesProgramadas = new Set<string>();

    for (const med of medicamentos || []) {
      if (
        !med.id ||
        med.status === "descontinuado" ||
        !med.estoque_horarios ||
        med.estoque_horarios.length === 0
      ) {
        continue;
      }

      const estoqueInfo =
        computeEstoqueInfo(med);

      const medicoObj = medicos.find(
        (m) => m.id === med.medico_id
      );

      const tratamentoObj =
        tratamentos.find(
          (t) =>
            t.id ===
            (med.tratamento_ids || [])[0]
        );

      const farmaciaObj =
        farmacias.find(
          (f) => f.id === med.farmacia_id
        );

      const estabelecimentoObj =
        hospitais.find(
          (h) => h.id === med.local_id
        );

      const insight =
        sugerirRenovacao(med);

      const receitaVencida =
        isReceitaVencidaSegura(
          med.proxima_renovacao
        );

      const comportamento =
        analisarComportamentoUso(
          med,
          historicoDosesCompleto.filter(
            (d) =>
              d.medicamento_id === med.id
          )
        );

      for (const horario of med.estoque_horarios) {
        if (!horario) continue;

        chavesProgramadas.add(
          `${med.id}-${horario}`
        );

        const log = (doseLogs || []).find(
          (l) =>
            l.medicamento_id === med.id &&
            l.horario === horario
        );

        const tomada = !!log?.tomado_em;
        const ignorada = !!log?.ignorado_em;

        list.push({
          medicamentoId: med.id,
          medicamentoNome: med.nome,
          dosagem: med.dosagem,
          horario,
          tomada,
          ignorada,
          cor:
            tratamentoObj?.cor ||
            med.cor_principal ||
            "#8B5CF6",
          estoqueRestante:
            estoqueInfo?.quantidadeRestante ?? 0,
          estoqueTotal:
            med.estoque_quantidade || 0,
          unidadeMedida:
            med.estoque_unidade_medida ||
            "unidades",
          unidadePorDose:
            med.estoque_unidade_por_dose ||
            1,
          medicoNome:
            medicoObj?.nome || med.medico,
          medicoId: medicoObj?.id,
          tratamentoNome:
            tratamentoObj?.nome,
          tratamentoId:
            tratamentoObj?.id,
          tratamentoCor:
            tratamentoObj?.cor,
          farmaciaNome:
            farmaciaObj?.nome,
          farmaciaId:
            farmaciaObj?.id,
          estabelecimentoNome:
            estabelecimentoObj?.nome,
          estabelecimentoId:
            estabelecimentoObj?.id,
          proximaRenovacao:
            med.proxima_renovacao,
          diasRestantes:
            getDaysUntil(
              med.proxima_renovacao
            ),
          insight,
          receitaVencida,
          comportamento,
          isAvulsa: false,
        });
      }
    }

    for (const log of doseLogs || []) {
      if (!log.medicamento_id) continue;

      const med = medicamentos.find(
        (m) => m.id === log.medicamento_id
      );

      if (!med) continue;

      const chaveProgramada = `${med.id}-${log.horario}`;
      const isOficialTomada =
        chavesProgramadas.has(chaveProgramada);

      if (
        !isOficialTomada &&
        log.tomado_em
      ) {
        const jaExisteAvulsa =
          list.some(
            (item) => item.logId === log.id
          );

        if (!jaExisteAvulsa) {
          const tratamentoObj =
            tratamentos.find(
              (t) =>
                t.id ===
                (med.tratamento_ids || [])[0]
            );

          const medicoObj =
            medicos.find(
              (m) =>
                m.id === med.medico_id
            );

          list.push({
            medicamentoId: med.id!,
            medicamentoNome: med.nome,
            dosagem: med.dosagem,
            horario:
              log.horario || "00:00",
            tomada: true,
            ignorada: false,
            cor:
              tratamentoObj?.cor ||
              med.cor_principal ||
              "#8B5CF6",
            estoqueRestante:
              med.estoque_quantidade ?? 0,
            estoqueTotal:
              med.estoque_quantidade || 0,
            unidadeMedida:
              med.estoque_unidade_medida ||
              "unidades",
            unidadePorDose:
              log.quantidade ||
              med.estoque_unidade_por_dose ||
              1,
            medicoNome:
              medicoObj?.nome ||
              med.medico,
            tratamentoNome:
              tratamentoObj?.nome,
            tratamentoId:
              tratamentoObj?.id,
            tratamentoCor:
              tratamentoObj?.cor,
            isAvulsa: true,
            motivoAvulsa:
              (log as any).observacoes ||
              "Dose avulsa / SOS",
            logId: log.id,
          });
        }
      }
    }

    for (const reg of registrosHoje) {
      if (reg.categoria === "sintoma") {
        list.push({
          horario:
            reg.horario || "00:00",
          tomada: true,
          ignorada: false,
          cor: "#F59E0B",
          isSintoma: true,
          sintomaId: reg.id,
          sintomaNome:
            reg.nome ||
            reg.tipo ||
            "Sintoma registrado",
          sintomaTipo: reg.tipo,
          intensidade: reg.intensidade,
          observacoesSintoma:
            reg.observacoes,
        });
      }
    }

    return list.sort((a, b) =>
      a.horario.localeCompare(b.horario)
    );
  }, [
    medicamentos,
    doseLogs,
    medicos,
    tratamentos,
    farmacias,
    hospitais,
    historicoDosesCompleto,
    registrosHoje,
  ]);

  const compromissosFiltrados = useMemo(() => {
    let items: any[] = [];

    if (
      filtroCompromisso === "todos" ||
      filtroCompromisso === "consultas"
    ) {
      items = [
        ...items,
        ...consultasHoje.map((c) => ({
          ...c,
          tipo: "consulta",
        })),
      ];
    }

    if (
      filtroCompromisso === "todos" ||
      filtroCompromisso === "cirurgias"
    ) {
      items = [
        ...items,
        ...cirurgiasHoje.map((c) => ({
          ...c,
          tipo: "cirurgia",
        })),
      ];
    }

    if (
      filtroCompromisso === "todos" ||
      filtroCompromisso === "exames"
    ) {
      items = [
        ...items,
        ...examesHoje.map((e) => ({
          ...e,
          tipo: "exame",
        })),
      ];
    }

    return items.sort((a, b) =>
      (a.horario || "00:00").localeCompare(
        b.horario || "00:00"
      )
    );
  }, [
    consultasHoje,
    cirurgiasHoje,
    examesHoje,
    filtroCompromisso,
  ]);

  const assistenteDiario = useMemo(
    () =>
      analisarRotinaDiaria(
        doses,
        compromissosFiltrados
      ),
    [doses, compromissosFiltrados]
  );

  const dosesFiltradas = useMemo(() => {
    let result = doses;

    if (filtroStatus === "tomados") {
      result = result.filter(
        (d) => d.tomada
      );
    } else if (
      filtroStatus === "pendentes"
    ) {
      result = result.filter(
        (d) =>
          !d.tomada &&
          !d.ignorada &&
          !d.isSintoma
      );
    } else if (
      filtroStatus === "ignorados"
    ) {
      result = result.filter(
        (d) => d.ignorada
      );
    }

    if (filtroPeriodo !== "todos") {
      result = result.filter(
        (d) =>
          getPeriodoDoDia(d.horario).key ===
          filtroPeriodo
      );
    }

    return result;
  }, [
    doses,
    filtroStatus,
    filtroPeriodo,
  ]);

  const dosesAgrupadas = useMemo(() => {
    const grupos: Record<
      string,
      {
        label: string;
        sub: string;
        icon: any;
        items: DoseItemExt[];
      }
    > = {
      manha: {
        label: "Manhã",
        sub: "Início do dia",
        icon: Sunrise,
        items: [],
      },
      tarde: {
        label: "Tarde",
        sub: "Período da tarde",
        icon: Sun,
        items: [],
      },
      noite: {
        label: "Noite",
        sub: "Final do dia",
        icon: Moon,
        items: [],
      },
    };

    dosesFiltradas.forEach((d) => {
      const periodo =
        getPeriodoDoDia(d.horario);

      if (grupos[periodo.key]) {
        grupos[periodo.key].items.push(d);
      }
    });

    return Object.entries(grupos).filter(
      ([, grupo]) =>
        grupo.items.length > 0
    );
  }, [dosesFiltradas]);

  const totalTomadas = doses.filter(
    (d) => d.tomada
  ).length;

  const totalPendentes = doses.filter(
    (d) =>
      !d.tomada &&
      !d.ignorada &&
      !d.isSintoma
  ).length;

  const totalIgnoradas = doses.filter(
    (d) => d.ignorada
  ).length;

  const totalRegistros = doses.length;

  const percentualConclusao =
    totalRegistros > 0
      ? Math.round(
          (totalTomadas / totalRegistros) *
            100
        )
      : 0;

  const isLoading =
    rawMedicamentos === undefined ||
    doseLogs === undefined;

  if (isLoading) {
    return <CardListSkeleton />;
  }

  const handleToggle = async (
    item: DoseItemExt
  ) => {
    if (
      processandoDoseId ||
      !item.medicamentoId
    ) {
      return;
    }

    const chaveDose = item.logId
      ? `log-${item.logId}`
      : `${item.medicamentoId}-${item.horario}`;

    setProcessandoDoseId(
      chaveDose
    );

    try {
      // ======================================================
      // DOSE AVULSA / SOS
      //
      // A remoção passa obrigatoriamente pelo repository.
      //
      // Ele é responsável por:
      //
      // - validar person_id;
      // - validar usuário;
      // - recuperar a quantidade histórica;
      // - restaurar estoque quando calculável;
      // - excluir o DoseLog;
      // - enfileirar DELETE para sincronização.
      // ======================================================

      if (
        item.isAvulsa &&
        item.logId
      ) {
        await removerDosePorId(
          item.logId
        );

        trigger(
          "vibrate"
        );

        showToast(
          "Dose avulsa removida",
          "info"
        );

        return;
      }

      // ======================================================
      // DOSE PROGRAMADA JÁ TOMADA → DESFAZER
      //
      // Nenhuma alteração manual de estoque é feita aqui.
      //
      // O repository usa a quantidade histórica do DoseLog para
      // restaurar exatamente o consumo que havia sido registrado.
      // ======================================================

      if (
        item.tomada
      ) {
        await desmarcarDose(
          item.medicamentoId,
          item.horario
        );

        trigger(
          "vibrate"
        );

        return;
      }

      // ======================================================
      // DOSE PROGRAMADA PENDENTE → TOMADA
      //
      // O repository registra o DoseLog e movimenta o estoque.
      // ======================================================

      await marcarDose(
        item.medicamentoId,
        item.horario
      );

      trigger(
        "success"
      );
    } catch (error) {
      console.error(
        "Erro ao atualizar dose:",
        error
      );

      trigger(
        "error"
      );

      showToast(
        "Erro ao atualizar dose",
        "error"
      );
    } finally {
      setProcessandoDoseId(
        null
      );
    }
  };

  const handleIgnorar = async (
    item: DoseItemExt
  ) => {
    if (
      processandoDoseId ||
      !item.medicamentoId
    ) {
      return;
    }

    setProcessandoDoseId(
      `${item.medicamentoId}-${item.horario}`
    );

    trigger("vibrate");

    try {
      await marcarComoIgnorada(
        item.medicamentoId,
        item.horario
      );

      showToast(
        "Dose ignorada",
        "info"
      );
    } catch (error) {
      console.error(
        "Erro ao ignorar dose:",
        error
      );

      trigger(
        "error"
      );

      showToast(
        "Erro ao ignorar dose",
        "error"
      );
    } finally {
      setProcessandoDoseId(null);
    }
  };

  const handleSalvarRenovacaoDoModal =
    async () => {
      if (
        !medicamentoSelecionado?.id ||
        isProcessing
      ) {
        return;
      }

      setIsProcessing(true);
      trigger("success");

      try {
        await safeAddRenovacao({
          user_id:
            medicamentoSelecionado.user_id,
          medicamento_id:
            medicamentoSelecionado.id,
          data: hoje,
          preco: precoRenovacao
            ? Number(
                precoRenovacao.replace(
                  ",",
                  "."
                )
              )
            : undefined,
          observacoes:
            observacoesRenovacao ||
            "Renovação rápida via alerta",
        });

        const estoqueAtual =
          medicamentoSelecionado.estoque_quantidade ||
          0;

        await safeUpdateMedicamento(
          medicamentoSelecionado.id,
          {
            estoque_quantidade:
              estoqueAtual +
              Number(adicionarMaisEstoque),
            estoque_data_referencia:
              hoje,
          }
        );

        showToast(
          "Sucesso!",
          "success"
        );

        setModalAberto(false);
        setPrecoRenovacao("");
        setObservacoesRenovacao("");
      } catch (error) {
        console.error(
          "Erro ao renovar:",
          error
        );

        showToast(
          "Erro ao renovar",
          "error"
        );
      } finally {
        setIsProcessing(false);
      }
    };

  const hasFiltrosAtivos =
    filtroStatus !== "todos" ||
    filtroPeriodo !== "todos" ||
    filtroCompromisso !== "todos";

  const limparFiltros = () => {
    trigger("vibrate");
    setFiltroStatus("todos");
    setFiltroPeriodo("todos");
    setFiltroCompromisso("todos");
  };

  const navegarCompromisso = (
    item: any
  ) => {
    trigger("vibrate");

    const rotas: Record<
      string,
      string
    > = {
      consulta: "/saude/consultas/detalhes",
      cirurgia:
        "/saude/cirurgias/detalhes",
      exame:
        "/saude/exames/detalhes",
    };

    const rota = rotas[item.tipo];

    if (rota && item.id) {
      router.push(
        `${rota}?id=${item.id}`
      );
    }
  };

  return (
    <PageTransition>
      <main className="min-h-screen bg-void pb-32">
        {/* =========================================================
            HEADER
        ========================================================= */}
        <header className="sticky top-0 z-20 border-b border-surface-border/30 bg-void/90 px-5 pb-3 pt-safe backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock
                  size={16}
                  className="shrink-0 text-ice"
                />

                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ice/90">
                  Linha do Tempo
                </p>
              </div>

              <h1 className="mt-1 font-display text-xl font-semibold text-ink-primary">
                Hoje
              </h1>
            </div>

            <div className="shrink-0 text-right">
              <span className="inline-flex items-center rounded-full border border-ice/20 bg-ice/10 px-3 py-1.5 font-mono text-[10px] font-bold text-ice">
                {totalTomadas}{" "}
                {totalTomadas === 1
                  ? "registro"
                  : "registros"}
              </span>
            </div>
          </div>

          {/* RESUMO */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  size={13}
                  className="text-emerald-400"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  Concluídos
                </span>
              </div>

              <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
                {totalTomadas}
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle
                  size={13}
                  className="text-coral"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  Pendentes
                </span>
              </div>

              <p className="mt-1 font-mono text-sm font-bold text-coral">
                {totalPendentes}
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border/40 bg-surface-raised/70 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Activity
                  size={13}
                  className="text-ice"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  Progresso
                </span>
              </div>

              <p className="mt-1 font-mono text-sm font-bold text-ice">
                {percentualConclusao}%
              </p>
            </div>
          </div>

          {/* FILTROS */}
          <div className="mt-3 -mx-1 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex min-w-max items-center gap-2 px-1">
              <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-border/40 bg-surface-raised px-3 py-1.5">
                <Filter
                  size={13}
                  className="text-ink-muted"
                />

                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  Filtros
                </span>
              </div>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroStatus(
                    filtroStatus ===
                      "pendentes"
                      ? "todos"
                      : "pendentes"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroStatus ===
                  "pendentes"
                    ? "border-coral bg-coral/20 text-coral"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <AlertTriangle size={12} />
                Pendentes ({totalPendentes})
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroStatus(
                    filtroStatus ===
                      "tomados"
                      ? "todos"
                      : "tomados"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroStatus ===
                  "tomados"
                    ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <CheckCircle2 size={12} />
                Concluídos
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroStatus(
                    filtroStatus ===
                      "ignorados"
                      ? "todos"
                      : "ignorados"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroStatus ===
                  "ignorados"
                    ? "border-ink-muted bg-surface-raised text-ink-muted"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <XCircle size={12} />
                Ignorados ({totalIgnoradas})
              </button>

              <div className="h-5 w-px shrink-0 bg-surface-border/40" />

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroPeriodo(
                    filtroPeriodo === "manha"
                      ? "todos"
                      : "manha"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroPeriodo === "manha"
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <Sunrise size={12} />
                Manhã
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroPeriodo(
                    filtroPeriodo === "tarde"
                      ? "todos"
                      : "tarde"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroPeriodo === "tarde"
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <Sun size={12} />
                Tarde
              </button>

              <button
                onClick={() => {
                  trigger("vibrate");

                  setFiltroPeriodo(
                    filtroPeriodo === "noite"
                      ? "todos"
                      : "noite"
                  );
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                  filtroPeriodo === "noite"
                    ? "border-ice bg-ice/20 text-ice"
                    : "border-surface-border/40 bg-surface-raised text-ink-muted hover:border-surface-border/80"
                }`}
              >
                <Moon size={12} />
                Noite
              </button>

              {hasFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-coral/10 px-3 py-1.5 text-[10px] font-medium text-coral"
                >
                  <X size={12} />
                  Limpar
                </button>
              )}
            </div>
          </div>
        </header>

        {/* =========================================================
            CONTEÚDO
        ========================================================= */}
        <section className="space-y-5 px-5 pt-4">
          {/* ASSISTENTE DIÁRIO */}
          {assistenteDiario && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className={`rounded-[26px] border p-4 shadow-sm ${
                assistenteDiario.urgencia ===
                "alta"
                  ? "border-coral/30 bg-coral/5"
                  : assistenteDiario.urgencia ===
                    "media"
                  ? "border-amber-400/30 bg-amber-400/5"
                  : "border-ice/30 bg-ice/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    assistenteDiario.urgencia ===
                    "alta"
                      ? "bg-coral/20 text-coral"
                      : assistenteDiario.urgencia ===
                        "media"
                      ? "bg-amber-400/20 text-amber-400"
                      : "bg-ice/20 text-ice"
                  }`}
                >
                  <Activity size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm font-bold ${
                        assistenteDiario.urgencia ===
                        "alta"
                          ? "text-coral"
                          : assistenteDiario.urgencia ===
                            "media"
                          ? "text-amber-400"
                          : "text-ice"
                      }`}
                    >
                      {assistenteDiario.titulo}
                    </h3>

                    <span className="text-xs text-ink-faint">
                      Dica
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-ink-primary">
                    {assistenteDiario.mensagem}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* =======================================================
              COMPROMISSOS
          ======================================================= */}
          {compromissosFiltrados.length >
            0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <Calendar
                    size={16}
                    className="text-coral"
                  />

                  <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                    Compromissos de Hoje
                  </h2>
                </div>

                <span className="rounded-full bg-coral/10 px-2 py-1 font-mono text-[9px] font-bold text-coral">
                  {compromissosFiltrados.length}
                </span>
              </div>

              <div className="space-y-2.5">
                {compromissosFiltrados.map(
                  (item: any) => {
                    const isConsulta =
                      item.tipo ===
                      "consulta";

                    const isCirurgia =
                      item.tipo ===
                      "cirurgia";

                    const getIcon = () => {
                      if (isConsulta) {
                        return (
                          <Stethoscope
                            size={18}
                            className="text-ice"
                          />
                        );
                      }

                      if (isCirurgia) {
                        return (
                          <Activity
                            size={18}
                            className="text-coral"
                          />
                        );
                      }

                      return (
                        <FlaskConical
                          size={18}
                          className="text-emerald-400"
                        />
                      );
                    };

                    const getColor =
                      () => {
                        if (isConsulta) {
                          return "border-ice/30 bg-ice/5";
                        }

                        if (isCirurgia) {
                          return "border-coral/30 bg-coral/5";
                        }

                        return "border-emerald-400/30 bg-emerald-400/5";
                      };

                    const getLabel =
                      () => {
                        if (isConsulta) {
                          return "Consulta agendada";
                        }

                        if (isCirurgia) {
                          return "Procedimento cirúrgico";
                        }

                        return "Realização de exame";
                      };

                    const descricao =
                      item.especialidade ||
                      item.procedimento ||
                      item.nome ||
                      "Compromisso de saúde";

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileTap={{
                          scale: 0.985,
                        }}
                        onClick={() =>
                          navegarCompromisso(
                            item
                          )
                        }
                        className={`w-full rounded-[24px] border p-4 text-left transition-all ${getColor()}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                            {getIcon()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-ink-primary">
                                {getLabel()}
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  isConsulta
                                    ? "bg-ice/10 text-ice"
                                    : isCirurgia
                                    ? "bg-coral/10 text-coral"
                                    : "bg-emerald-400/10 text-emerald-400"
                                }`}
                              >
                                Hoje
                              </span>
                            </div>

                            <p className="mt-1 truncate text-xs text-ink-muted">
                              {descricao}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {item.horario && (
                              <span className="rounded-lg bg-coral/10 px-2 py-1 font-mono text-[10px] font-bold text-coral">
                                {item.horario}
                              </span>
                            )}

                            <span className="rounded-full bg-ice/10 px-2.5 py-1 text-[9px] font-medium text-ice">
                              Ver
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* =======================================================
              TIMELINE / DOSES
          ======================================================= */}
          {dosesFiltradas.length === 0 ? (
            <EmptyState
              icon={Pill}
              title={
                hasFiltrosAtivos
                  ? "Nada com esses filtros"
                  : "Nenhum registro hoje"
              }
              description={
                hasFiltrosAtivos
                  ? "Tente ajustar os filtros para ver mais itens."
                  : "Registre uma dose avulsa ou adicione um sintoma para preencher sua linha do tempo."
              }
              actionLabel={
                !hasFiltrosAtivos
                  ? "Registrar Dose Avulsa"
                  : undefined
              }
              onAction={
                !hasFiltrosAtivos
                  ? () => {
                      trigger(
                        "vibrate"
                      );
                      setIsDoseModalOpen(
                        true
                      );
                    }
                  : undefined
              }
              iconClassName="border-ice/20 bg-ice/10 text-ice"
            />
          ) : (
            dosesAgrupadas.map(
              ([key, grupo]) => {
                const total =
                  grupo.items.length;

                const concluidos =
                  grupo.items.filter(
                    (i) => i.tomada
                  ).length;

                const progresso =
                  total > 0
                    ? Math.round(
                        (concluidos /
                          total) *
                          100
                      )
                    : 0;

                const GrupoIcon = grupo.icon;

                return (
                  <div
                    key={key}
                    className="space-y-3"
                  >
                    <div className="flex items-end justify-between gap-4 px-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised text-ice border border-surface-border/40">
                          <GrupoIcon size={15} />
                        </div>
                        <div>
                          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-primary">
                            {grupo.label}
                          </h2>
                          <p className="text-[11px] text-ink-muted">
                            {grupo.sub}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <div className="hidden w-20 overflow-hidden rounded-full bg-surface-border sm:block">
                          <div
                            className="h-1.5 rounded-full bg-emerald-400 transition-all duration-500"
                            style={{
                              width: `${progresso}%`,
                            }}
                          />
                        </div>

                        <span className="font-mono text-[10px] text-ink-faint">
                          {concluidos}/
                          {total}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {grupo.items.map(
                        (item) => {
                          if (
                            item.isSintoma
                          ) {
                            return (
                              <motion.button
                                key={`sintoma-${item.sintomaId}`}
                                type="button"
                                whileTap={{
                                  scale: 0.985,
                                }}
                                onClick={() => {
                                  trigger(
                                    "vibrate"
                                  );

                                  router.push(
                                    `/saude/registros/detalhes?id=${item.sintomaId}`
                                  );
                                }}
                                style={{
                                  borderLeft: `6px solid ${item.cor}`,
                                }}
                                className="group relative flex w-full flex-col gap-3 rounded-[24px] border border-amber-400/30 bg-amber-400/5 p-4 text-left shadow-sm transition-all hover:border-amber-400/60"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                                    <Activity
                                      size={20}
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                        <AlertTriangle size={12} /> Sintoma
                                      </span>

                                      <span className="text-[10px] text-ink-faint">
                                        •
                                      </span>

                                      <span className="font-mono text-[10px] text-ink-faint">
                                        {
                                          item.horario
                                        }
                                      </span>
                                    </div>

                                    <p className="mt-0.5 text-sm font-semibold text-ink-primary">
                                      {
                                        item.sintomaNome
                                      }
                                    </p>

                                    {item.intensidade && (
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-medium text-ink-muted">
                                          Intensidade:
                                        </span>

                                        <div className="flex gap-0.5">
                                          {[
                                            1,
                                            2,
                                            3,
                                            4,
                                            5,
                                          ].map(
                                            (
                                              nivel
                                            ) => (
                                              <div
                                                key={
                                                  nivel
                                                }
                                                className={`h-1.5 w-3.5 rounded-full ${
                                                  nivel <=
                                                  (item.intensidade ||
                                                    1)
                                                    ? "bg-amber-400"
                                                    : "bg-surface-border"
                                                }`}
                                              />
                                            )
                                          )}
                                        </div>

                                        <span className="font-mono text-[10px] font-bold text-amber-400">
                                          {
                                            item.intensidade
                                          }
                                          /5
                                        </span>
                                      </div>
                                    )}

                                    {item.observacoesSintoma && (
                                      <p className="mt-2 line-clamp-2 text-xs italic text-ink-muted">
                                        "
                                        {
                                          item.observacoesSintoma
                                        }
                                        "
                                      </p>
                                    )}
                                  </div>

                                  <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-1 text-[9px] font-semibold text-amber-400">
                                    Ver
                                  </span>
                                </div>
                              </motion.button>
                            );
                          }

                          const isAtrasado =
                            !item.tomada &&
                            !item.ignorada &&
                            item.horario <
                              horaAtual &&
                            !item.isAvulsa;

                          const isProximo =
                            !item.tomada &&
                            !item.ignorada &&
                            item.horario >=
                              horaAtual &&
                            !item.isAvulsa;

                          const isEstoqueZerado =
                            (item.estoqueRestante ??
                              0) <= 0;

                          const tratamentoCor =
                            item.tratamentoCor ||
                            item.cor ||
                            "#8B5CF6";

                          const isProcessando =
                            processandoDoseId ===
                            (item.logId
                              ? `log-${item.logId}`
                              : `${item.medicamentoId}-${item.horario}`);

                          const diasEstilo =
                            getDiasRestantesEstilo(
                              item.diasRestantes
                            );

                          let statusIcon =
                            null;

                          let statusText =
                            "";

                          let statusColor =
                            "";

                          if (
                            item.tomada
                          ) {
                            statusIcon = (
                              <CheckCircle2
                                size={12}
                                className="text-emerald-400"
                              />
                            );

                            statusText =
                              item.isAvulsa
                                ? "Tomada · Avulsa"
                                : "Tomada";

                            statusColor =
                              "text-emerald-400";
                          } else if (
                            item.ignorada
                          ) {
                            statusIcon = (
                              <XCircle
                                size={12}
                                className="text-ink-muted"
                              />
                            );

                            statusText =
                              "Ignorada";

                            statusColor =
                              "text-ink-muted";
                          } else if (
                            isAtrasado
                          ) {
                            statusIcon = (
                              <AlertTriangle
                                size={12}
                                className="text-coral"
                              />
                            );

                            statusText =
                              "Atrasado";

                            statusColor =
                              "text-coral";
                          } else if (
                            isProximo
                          ) {
                            statusIcon = (
                              <Clock
                                size={12}
                                className="text-amber-400"
                              />
                            );

                            statusText =
                              "Próximo";

                            statusColor =
                              "text-amber-400";
                          } else {
                            statusIcon = (
                              <Circle
                                size={12}
                                className="text-ink-faint"
                              />
                            );

                            statusText =
                              item.horario;

                            statusColor =
                              "text-ink-faint";
                          }

                          return (
                            <motion.div
                              key={
                                item.logId ||
                                `${item.medicamentoId}-${item.horario}`
                              }
                              role="button"
                              tabIndex={0}
                              aria-label="Abrir detalhes do medicamento"
                              onClick={() => {
                                if (!item.medicamentoId) return;

                                trigger("vibrate");

                                router.push(
                                  "/saude/medicamentos/detalhes?id=" +
                                    item.medicamentoId
                                );
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "Enter" &&
                                  event.key !== " "
                                ) return;

                                event.preventDefault();

                                if (item.medicamentoId) {
                                  router.push(
                                    "/saude/medicamentos/detalhes?id=" +
                                      item.medicamentoId
                                  );
                                }
                              }}
                              whileTap={{
                                scale: 0.99,
                              }}
                              style={{
                                borderLeft: `4px solid ${tratamentoCor}`,
                              }}
                              className={`group relative w-full cursor-pointer rounded-[20px] border p-3 pr-8 text-left shadow-sm transition-all ${
                                item.tomada
                                  ? "border-emerald-400/30 bg-emerald-400/5 opacity-90"
                                  : item.ignorada
                                  ? "border-ink-muted/20 bg-surface-raised/50 opacity-60"
                                  : isAtrasado
                                  ? "border-coral/50 bg-coral/5"
                                  : isProximo
                                  ? "border-amber-400/20 bg-amber-400/5"
                                  : "border-surface-border/50 bg-surface"
                              } ${
                                isProcessando
                                  ? "pointer-events-none opacity-50"
                                  : ""
                              }`}
                            >
                              <ChevronRight
                                size={16}
                                aria-hidden="true"
                                className="absolute right-3 top-3 text-ink-faint"
                              />

                              <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                  <div className="shrink-0 pt-0.5">
                                    {item.tomada ? (
                                      <CheckCircle2
                                        size={20}
                                        className="text-emerald-400"
                                      />
                                    ) : item.ignorada ? (
                                      <XCircle
                                        size={20}
                                        className="text-ink-muted"
                                      />
                                    ) : (
                                      <Circle
                                        size={20}
                                        className="text-ink-faint"
                                      />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span
                                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold ${statusColor}`}
                                      >
                                        {statusIcon}
                                        {statusText}
                                      </span>

                                      <span className="text-[10px] text-ink-faint">
                                        •
                                      </span>

                                      <span className="font-mono text-[10px] text-ink-faint">
                                        {
                                          item.horario
                                        }
                                      </span>

                                      {item.isAvulsa && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-400">
                                          <Zap size={10} /> SOS / Avulsa
                                        </span>
                                      )}
                                    </div>

                                    <p
                                      className={`mt-1 truncate text-sm font-semibold ${
                                        item.ignorada
                                          ? "text-ink-muted line-through"
                                          : "text-ink-primary"
                                      }`}
                                    >
                                      {
                                        item.medicamentoNome
                                      }
                                    </p>

                                    {item.dosagem && (
                                      <p className="mt-0.5 text-xs font-medium text-ink-muted">
                                        {
                                          item.dosagem
                                        }
                                      </p>
                                    )}

                                    {item.isAvulsa &&
                                      item.motivoAvulsa && (
                                        <p className="mt-2 w-fit max-w-full rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                                          Motivo:{" "}
                                          {
                                            item.motivoAvulsa
                                          }
                                        </p>
                                      )}

                                    {(item.tratamentoNome ||
                                      item.medicoNome ||
                                      item.farmaciaNome) && (
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        {item.tratamentoNome &&
                                          item.tratamentoId && (
                                            <span
                                              className="max-w-full truncate rounded-md px-2 py-0.5 text-[9px] font-bold uppercase"
                                              style={{
                                                backgroundColor: `${tratamentoCor}20`,
                                                color: tratamentoCor,
                                              }}
                                            >
                                              {
                                                item.tratamentoNome
                                              }
                                            </span>
                                          )}

                                        {item.medicoNome && (
                                          <span className="flex max-w-full items-center gap-1 truncate text-[10px] text-ink-muted">
                                            <Stethoscope
                                              size={
                                                10
                                              }
                                              className="shrink-0"
                                            />
                                            <span className="truncate">
                                              Dr(a).{" "}
                                              {
                                                item.medicoNome
                                              }
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {!item.isAvulsa && (
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        {(
                                          item.estoqueRestante ??
                                          0
                                        ) >= 0 && (
                                          <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-ink-muted">
                                            Estoque:{" "}
                                            {
                                              item.estoqueRestante
                                            }{" "}
                                            {
                                              item.unidadeMedida
                                            }
                                          </span>
                                        )}

                                        {item.diasRestantes !==
                                          undefined &&
                                          item.diasRestantes !==
                                            null &&
                                          item.diasRestantes >=
                                            0 && (
                                            <span
                                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${diasEstilo.cor} ${diasEstilo.bg}`}
                                            >
                                              <Calendar
                                                size={
                                                  11
                                                }
                                              />

                                              {
                                                item.diasRestantes
                                              }{" "}
                                              dias
                                            </span>
                                          )}
                                      </div>
                                    )}

                                    {!item.isAvulsa &&
                                      isEstoqueZerado && (
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-coral">
                                            <AlertTriangle
                                              size={
                                                14
                                              }
                                            />
                                            Estoque zerado!
                                          </span>

                                          <button
                                            type="button"
                                            onClick={(
                                              e
                                            ) => {
                                              e.stopPropagation();

                                              trigger(
                                                "vibrate"
                                              );

                                              const med =
                                                medicamentos.find(
                                                  (
                                                    m
                                                  ) =>
                                                    m.id ===
                                                    item.medicamentoId
                                                );

                                              if (
                                                med
                                              ) {
                                                setMedicamentoSelecionado(
                                                  med
                                                );

                                                setModalAberto(
                                                  true
                                                );
                                              }
                                            }}
                                            className="rounded-full bg-coral/20 px-2.5 py-1 text-[9px] font-bold text-coral transition-colors hover:bg-coral/30"
                                          >
                                            Renovar
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-border/30 pt-2">
                                  {!item.tomada &&
                                    !item.ignorada &&
                                    !item.isAvulsa && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(
                                            e
                                          ) => {
                                            e.stopPropagation();

                                            handleIgnorar(
                                              item
                                            );
                                          }}
                                          disabled={
                                            isProcessando ||
                                            isProcessing
                                          }
                                          className="rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-[10px] font-medium text-ink-muted transition-all hover:bg-ink-muted/10 active:scale-95 disabled:opacity-50"
                                        >
                                          Ignorar
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(
                                            e
                                          ) => {
                                            e.stopPropagation();

                                            handleToggle(
                                              item
                                            );
                                          }}
                                          disabled={
                                            isProcessando ||
                                            isProcessing
                                          }
                                          className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3.5 py-1.5 text-[10px] font-bold text-void shadow-sm transition-all hover:bg-emerald-300 active:scale-95 disabled:opacity-50"
                                        >
                                          <CheckCircle2 size={13} />
                                          {isProcessando
                                            ? "..."
                                            : "Tomar"}
                                        </button>
                                      </>
                                    )}

                                  {item.tomada && (
                                    <button
                                      type="button"
                                      onClick={(
                                        e
                                      ) => {
                                        e.stopPropagation();

                                        handleToggle(
                                          item
                                        );
                                      }}
                                      disabled={
                                        isProcessando ||
                                        isProcessing
                                      }
                                      className="inline-flex items-center gap-1 rounded-full border border-surface-border/50 bg-surface-raised px-3 py-1.5 text-[10px] font-medium text-ink-muted transition-all hover:bg-ink-muted/10 active:scale-95 disabled:opacity-50"
                                    >
                                      {item.isAvulsa ? (
                                        <>
                                          <Trash2 size={12} /> Excluir
                                        </>
                                      ) : (
                                        <>
                                          <RotateCcw size={12} /> Desfazer
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )
          )}
        </section>

        {/* =========================================================
            MODAL — DOSE AVULSA
        ========================================================= */}
        <QuickDoseModal
          isOpen={isDoseModalOpen}
          onClose={() =>
            setIsDoseModalOpen(false)
          }
          onSuccess={() => {
            if (
              typeof window !==
              "undefined"
            ) {
              window.dispatchEvent(
                new Event(
                  "sync:process"
                )
              );
            }
          }}
        />

        {/* =========================================================
            MODAL — ESTOQUE BAIXO
        ========================================================= */}
        <AnimatePresence>
          {modalAberto &&
            medicamentoSelecionado && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-md"
                onClick={() => {
                  trigger("vibrate");
                  setModalAberto(false);
                }}
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.95,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    y: 10,
                  }}
                  transition={{
                    duration: 0.18,
                  }}
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  className="w-full max-w-md overflow-hidden rounded-[32px] border border-surface-border bg-surface shadow-2xl"
                >
                  <div className="border-b border-surface-border/50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral/20 text-coral">
                          <AlertTriangle
                            size={21}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-display text-base font-bold text-ink-primary">
                            Estoque baixo
                          </h3>

                          <p className="truncate text-xs text-ink-muted">
                            {
                              medicamentoSelecionado.nome
                            }
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          trigger(
                            "vibrate"
                          );
                          setModalAberto(
                            false
                          );
                        }}
                        className="shrink-0 rounded-full p-2 text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink-primary"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="rounded-2xl border border-coral/20 bg-coral/5 p-3">
                      <p className="text-xs leading-relaxed text-ink-muted">
                        Deseja registrar a
                        renovação e repor o
                        estoque no sistema?
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-ink-muted">
                          Unidades a adicionar
                        </label>

                        <input
                          type="number"
                          min="0"
                          value={
                            adicionarMaisEstoque
                          }
                          onChange={(e) =>
                            setAdicionarMaisEstoque(
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none transition-colors focus:border-ice"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-ink-muted">
                          Preço pago (R$)
                          <span className="ml-1 text-ink-faint">
                            — opcional
                          </span>
                        </label>

                        <div className="relative">
                          <DollarSign
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400"
                          />

                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={
                              precoRenovacao
                            }
                            onChange={(e) =>
                              setPrecoRenovacao(
                                e.target
                                  .value
                              )
                            }
                            className="w-full rounded-2xl border border-surface-border bg-surface-raised py-3 pl-10 pr-4 font-mono text-sm text-ink-primary outline-none transition-colors focus:border-ice"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium text-ink-muted">
                          Observações
                        </label>

                        <input
                          type="text"
                          placeholder="Ex: Farmácia X / SUS"
                          value={
                            observacoesRenovacao
                          }
                          onChange={(e) =>
                            setObservacoesRenovacao(
                              e.target
                                .value
                            )
                          }
                          className="w-full rounded-2xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none transition-colors focus:border-ice"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-surface-border/50 p-5">
                    <button
                      type="button"
                      onClick={() => {
                        trigger(
                          "vibrate"
                        );
                        setModalAberto(
                          false
                        );
                      }}
                      className="flex-1 rounded-2xl border border-surface-border bg-surface-raised py-3 text-xs font-semibold text-ink-muted transition-all active:scale-95"
                    >
                      Depois
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleSalvarRenovacaoDoModal
                      }
                      disabled={
                        isProcessing
                      }
                      className="flex-1 rounded-2xl bg-emerald-400 py-3 text-xs font-semibold text-void shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing
                        ? "Salvando..."
                        : "Repor e Renovar"}
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