"use client";

import { useMemo, useEffect, useState } from "react";
import { decideMedicationAlerts, MEDICATION_ALERT_PREF_EVENT } from "@/lib/health-intelligence/medication-alert-policy";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill,
  FileWarning,
  PackageX,
  ChevronRight,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { useHapticFeedback } from "@/lib/haptics";
import { useMedicamentos } from "@/hooks/useMedicamentos";
import { sugerirRenovacao } from "@/lib/health-insights";
import { getClinicalStockSnapshot } from "@/lib/health-intelligence/clinical-stock";
import { indexScheduledWithdrawals, medicationAccessAction, medicationAccessAlertTitle, withdrawalDueState } from "@/lib/medication-access-action";
import { useRetiradas } from "@/hooks/useRetiradas";
import { useLocalDay } from "@/hooks/useLocalDay";
import { useRenovacoes } from "@/hooks/useRenovacoes";
import { decideMedicationCarePath } from "@/lib/health-intelligence/medication-care-decision";

export function MedicamentosNotifications() {
  const { trigger } = useHapticFeedback();
  const router = useRouter();

  // ✅ Agora usa o hook que filtra por activePersonId
  const { medicamentos } = useMedicamentos();
  const { retiradas } = useRetiradas();
  const { renovacoes = [] } = useRenovacoes();
  const scheduledWithdrawals = useMemo(() => indexScheduledWithdrawals(retiradas), [retiradas]);
  const renewalsByMedication = useMemo(() => {
    const index = new Map<string, typeof renovacoes>();
    for (const renewal of renovacoes) {
      const rows = index.get(renewal.medicamento_id);
      if (rows) rows.push(renewal); else index.set(renewal.medicamento_id, [renewal]);
    }
    return index;
  }, [renovacoes]);
  const [prefsRevision, setPrefsRevision] = useState(0);
  useEffect(() => { const changed = () => setPrefsRevision(n => n+1);
    window.addEventListener(MEDICATION_ALERT_PREF_EVENT, changed);
    return () => window.removeEventListener(MEDICATION_ALERT_PREF_EVENT, changed);
  }, []);
  const today = useLocalDay();

  const { alertas } = useMemo(() => {
    const itensAlerta: any[] = [];
    const alertIndex = new Map<string, number>();
    const rank = { pendente: 3, hoje: 2, proxima: 1 } as const;
    const addAlert = (item: any) => {
      const index = alertIndex.get(item.id);
      if (index === undefined) {
        alertIndex.set(item.id, itensAlerta.length);
        itensAlerta.push(item);
        return;
      }
      const current = itensAlerta[index];
      if (rank[item.urgencia as keyof typeof rank] > rank[current.urgencia as keyof typeof rank] ||
          (rank[item.urgencia as keyof typeof rank] === rank[current.urgencia as keyof typeof rank] && item.tipo === "withdrawal" && current.tipo !== "withdrawal")) {
        itensAlerta[index] = item;
      }
    };

    medicamentos.forEach((med: any) => {
      const rawWithdrawal = scheduledWithdrawals.get(med.id);
      const decision = decideMedicationAlerts({medication:med,withdrawals:rawWithdrawal?[rawWithdrawal]:[],today});
      const pendingWithdrawal = decision.withdrawal;
      const withdrawalState = withdrawalDueState(pendingWithdrawal, today);
      if (pendingWithdrawal && (withdrawalState === "overdue" || withdrawalState === "today")) {
        const overdue = withdrawalState === "overdue";
        addAlert({
          id: med.id,
          tipo: "withdrawal",
          urgencia: overdue ? "pendente" : "hoje",
          titulo: overdue ? "Retirada atrasada" : "Retirada hoje",
          descricao: `${med.nome}: compromisso ${overdue ? "não concluído" : "agendado"}. Concluir, reagendar ou encerrar.`,
          data: pendingWithdrawal.data,
          href: `/saude/retiradas/detalhes?id=${encodeURIComponent(pendingWithdrawal.id!)}&return_to=${encodeURIComponent("/")}`,
          actionLabel: "Abrir retirada",
        });
      }
      // 1. Planejamento de renovação
      //
      // proxima_renovacao é uma data operacional. Ela NÃO
      // representa validade clínica da receita.
      //
      // O cérebro decide se existe necessidade real de
      // renovação considerando também estoque e contexto.
      const renovacaoInsight =
        sugerirRenovacao(
          med
        );
      const stock = getClinicalStockSnapshot(med);
      const careDecision = decideMedicationCarePath({
        medication: med,
        renewals: renewalsByMedication.get(med.id) ?? [],
        withdrawal: pendingWithdrawal ?? null,
        today,
        needsPrescription: Boolean(renovacaoInsight.deveRenovar && renovacaoInsight.motivo === "receita"),
        needsStock: stock.state === "empty" || stock.state === "negative" ||
          (stock.state === "available" && ((stock.daysRemaining !== null && stock.daysRemaining <= 3) ||
            (stock.daysRemaining === null && stock.dosesRemaining !== null && stock.dosesRemaining <= 3))),
      });

      // V228: one operational priority per medication; an existing withdrawal
      // takes precedence over a duplicate request for recipe/replenishment.
      if (renovacaoInsight.deveRenovar && decision.showPrescription && !decision.withdrawal && careDecision.stage === "prescription_needed") {
        const dias =
          renovacaoInsight.diasAteRenovacao;

        const action = medicationAccessAction(
          renovacaoInsight,
          med.id,
          "/",
          { tipoUso: med.tipo_uso, tipoAquisicao: med.tipo_aquisicao, scheduledWithdrawalId: scheduledWithdrawals.get(med.id)?.id }
        );

        const dataPlanejada = action?.kind === "prescription" && med.lembrete_receita_modo ===
            "data_personalizada" &&
          med.lembrete_receita_data
            ? med.lembrete_receita_data
            : action?.kind === "prescription"
              ? med.proxima_renovacao || ""
              : action?.kind === "withdrawal"
                ? pendingWithdrawal?.data || (med.tipo_aquisicao === "sus" ? med.data_retorno_sus || "" : "")
                : "";

        if (action) addAlert({
          id: med.id,
          tipo: action.kind,
          urgencia:
            renovacaoInsight.urgencia ===
              "alta"
              ? "pendente"
              : dias === 0
                ? "hoje"
                : "proxima",
          titulo: medicationAccessAlertTitle(action, dias),
          descricao:
            renovacaoInsight.mensagem ||
            med.nome,
          data:
            dataPlanejada,
          href: action.href,
          actionLabel: action.label,
        });
      }

      // 2. Estoque clínico V2 — VAULT_CLINICAL_STOCK_V47
      // Ausência de saldo NÃO significa zero. Quando a estimativa por dose
      // é confiável, priorizamos dias/doses; caso contrário preservamos
      // somente o saldo conhecido, sem inventar conversão clínica.
      const sos = med.tipo_uso === "sos" || med.tipo_uso === "esporadico";
      const publicSupply = med.tipo_aquisicao === "sus";
      const stockAction = medicationAccessAction(
        {
          ...renovacaoInsight,
          deveRenovar: true,
          motivo: publicSupply ? "sus" : "estoque",
        },
        med.id,
        "/",
        { tipoUso: med.tipo_uso, tipoAquisicao: med.tipo_aquisicao, scheduledWithdrawalId: scheduledWithdrawals.get(med.id)?.id }
      );

      const stockPlanAlreadyExists = careDecision.stage === "acquisition_planned" || careDecision.stage === "withdrawal_planned";
      if (decision.showStock && !stockPlanAlreadyExists && (stock.state === "empty" || stock.state === "negative")) {
        if (stockAction) addAlert({
          id: med.id,
          tipo: "estoque",
          urgencia: sos && stock.state !== "negative" ? "proxima" : "pendente",
          titulo: careDecision.stage === "acquisition_needed" ? "Receita pronta · falta adquirir" : stockAction.cta === "Ver retirada pendente" ? "Retirada pendente" : "Sem estoque",
          descricao:
            stock.state === "negative"
              ? `${med.nome} está com saldo negativo e precisa de conferência`
              : `${med.nome} acabou`,
          data: sos ? "Revisar necessidade" : "Revisar reposição",
          href: careDecision.stage === "acquisition_needed" ? careDecision.actionHref : stockAction.href,
          actionLabel: careDecision.stage === "acquisition_needed" ? careDecision.actionLabel : stockAction.label,
        });
      } else if (
        decision.showStock && !stockPlanAlreadyExists &&
        stock.state === "available" &&
        (
          (stock.daysRemaining !== null && stock.daysRemaining <= 3) ||
          (stock.daysRemaining === null &&
            stock.dosesRemaining !== null &&
            stock.dosesRemaining <= 3)
        )
      ) {
        const restante =
          stock.daysRemaining !== null
            ? `${stock.daysRemaining} dia${stock.daysRemaining === 1 ? "" : "s"}`
            : `${stock.dosesRemaining} dose${stock.dosesRemaining === 1 ? "" : "s"}`;

        if (stockAction) addAlert({
          id: med.id,
          tipo: "estoque",
          urgencia: "hoje",
          titulo: stockAction.cta === "Ver retirada pendente" ? "Retirada pendente" : "Estoque baixo",
          descricao: `${med.nome}: cerca de ${restante} restante`,
          data: sos ? "Conforme necessidade" : publicSupply ? "Planejar retirada" : "Planejar reposição",
          href: stockAction.href,
          actionLabel: stockAction.label,
        });
      }
    });

    // Ordenar: Pendentes/Zerados primeiro, Hoje em segundo, Próximas em terceiro
    itensAlerta.sort((a, b) => {
      const peso = { pendente: 1, hoje: 2, proxima: 3 };
      const pesoA = peso[a.urgencia as keyof typeof peso] || 99;
      const pesoB = peso[b.urgencia as keyof typeof peso] || 99;

      if (pesoA !== pesoB) return pesoA - pesoB;
      return String(a.data).localeCompare(String(b.data));
    });

    return { alertas: itensAlerta };
  }, [medicamentos, scheduledWithdrawals, today, renewalsByMedication, prefsRevision]);

  if (alertas.length === 0) return null;

  const getUrgencyColor = (urgencia: string) => {
    switch (urgencia) {
      case "pendente":
        return "bg-coral/10 border-coral/30 text-coral";
      case "hoje":
        return "bg-amber-400/10 border-amber-400/30 text-amber-400";
      case "proxima":
        return "bg-emerald-400/10 border-emerald-400/30 text-emerald-400";
      default:
        return "bg-surface-raised border-surface-border text-ink-primary";
    }
  };

  const formatDateDisplay = (isoStr: string) => {
    if (isoStr === "Imediato" || isoStr === "Comprar em breve") return isoStr;
    const parts = isoStr.split("-");
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <div className="w-full space-y-3 mb-6">
      <div className="flex items-center gap-2 px-1">
        <Pill size={16} className="text-ink-primary" />
        <h3 className="font-display text-sm font-semibold text-ink-primary">
          Acesso e medicamentos
        </h3>
      </div>

      <div 
        className="-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-4 gap-3 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <AnimatePresence>
          {alertas.map((alerta, index) => (
            <motion.button
              type="button"
              key={`${alerta.tipo}-${alerta.id}-${index}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => {
                trigger("vibrate");
                router.push(alerta.href || `/saude/medicamentos/detalhes?id=${alerta.id}`);
              }}
              className={`group w-[78%] max-w-[300px] shrink-0 snap-start flex items-center justify-between gap-2.5 rounded-[20px] border p-3 text-left shadow-sm transition-all active:scale-[0.98] cursor-pointer ${getUrgencyColor(alerta.urgencia)}`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    alerta.urgencia === "pendente"
                      ? "bg-coral/20 border-coral/30"
                      : alerta.urgencia === "hoje"
                      ? "bg-amber-400/20 border-amber-400/30"
                      : "bg-emerald-400/20 border-emerald-400/30"
                  }`}
                >
                  {alerta.tipo === "estoque" ? (
                    <PackageX size={18} />
                  ) : alerta.urgencia === "pendente" ? (
                    <AlertCircle size={18} />
                  ) : (
                    <FileWarning size={18} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {alerta.titulo}
                    </span>
                    {alerta.data && <span className="font-mono text-[10px] opacity-70">
                      {formatDateDisplay(alerta.data)}
                    </span>}
                  </div>
                  <p className="truncate font-medium text-sm mt-0.5">
                    {alerta.descricao}
                  </p>
                  <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wide opacity-75">
                    {alerta.actionLabel}
                  </span>
                </div>
              </div>

              <ChevronRight
                size={16}
                className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
              />
            </motion.button>
          ))}
        </AnimatePresence>
        <div className="w-2 shrink-0" />
      </div>
    </div>
  );
}
