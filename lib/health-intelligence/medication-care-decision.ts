import type { Medicamento, Renovacao, Retirada } from "@/lib/types";
import { isFutureAcquisition, isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";
import { buildMedicationJourneySnapshot, medicationJourneyEvidence } from "@/lib/health-intelligence/medication-workspace";

export type MedicationCareStage =
  | "withdrawal_overdue"
  | "withdrawal_planned"
  | "prescription_needed"
  | "acquisition_needed"
  | "acquisition_planned"
  | "stock_review"
  | "stable";

export interface MedicationCareDecision {
  stage: MedicationCareStage;
  label: string;
  explanation: string;
  actionLabel: string;
  actionHref: string;
  evidence: string[];
  prescriptionOnFile: boolean;
  plannedAcquisition: boolean;
}

export type MedicationCareTone = "critical" | "attention" | "planning" | "stable";

export function medicationCareStageNeedsAttention(stage: MedicationCareStage): boolean {
  return stage === "withdrawal_overdue" || stage === "prescription_needed" || stage === "acquisition_needed" || stage === "stock_review";
}

export function medicationCareStageIsPlanning(stage: MedicationCareStage): boolean {
  return stage === "withdrawal_planned" || stage === "acquisition_planned";
}

/**
 * Canonical presentation shared by list/detail surfaces. Keeping this next to the
 * decision prevents a correct care stage from receiving a contradictory colour or
 * urgency label in another screen.
 */
export function medicationCarePresentation(
  decision: Pick<MedicationCareDecision, "stage">,
  urgency?: "alta" | "media" | "baixa" | "nenhuma" | null,
): { tone: MedicationCareTone; actionClass: string; badgeClass: string } {
  const critical = decision.stage === "withdrawal_overdue" || urgency === "alta";
  const planning = medicationCareStageIsPlanning(decision.stage);
  const stable = decision.stage === "stable";
  const tone: MedicationCareTone = critical ? "critical" : stable ? "stable" : planning ? "planning" : "attention";
  if (tone === "critical") return {
    tone,
    actionClass: "border-coral/25 bg-coral/[0.08] text-coral",
    badgeClass: "border-coral/20 bg-coral/[0.06] text-coral",
  };
  if (tone === "planning") return {
    tone,
    actionClass: "border-ice/25 bg-ice/[0.08] text-ice",
    badgeClass: "border-ice/20 bg-ice/[0.06] text-ice",
  };
  if (tone === "stable") return {
    tone,
    actionClass: "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-400",
    badgeClass: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400",
  };
  return {
    tone,
    actionClass: "border-amber-400/25 bg-amber-400/[0.08] text-amber-400",
    badgeClass: "border-amber-400/20 bg-amber-400/[0.06] text-amber-400",
  };
}

export function plannedPrescriptionAgendaState(plannedDate: string | null | undefined, selectedDate: string, today: string) {
  const day = plannedDate?.slice(0, 10) ?? "";
  const valid = validDay(day) && validDay(selectedDate) && validDay(today);
  const overdue = valid && selectedDate === today && day < today;
  return { visible: valid && (day === selectedDate || overdue), overdue, day };
}

const validDay = (value?: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)));

/**
 * Read-only care-path decision. It never turns a prescription into an acquisition,
 * never treats a future purchase as received stock and never closes a withdrawal.
 */
export function decideMedicationCarePath(input: {
  medication: Medicamento;
  renewals: readonly Renovacao[];
  withdrawal?: Retirada | null;
  today: string;
  needsPrescription: boolean;
  needsStock: boolean;
}): MedicationCareDecision {
  const { medication, today } = input;
  const id = medication.id || "";
  const events = input.renewals
    .filter(event => event.medicamento_id === id && event.user_id === medication.user_id &&
      (!event.person_id || !medication.person_id || event.person_id === medication.person_id))
    .sort((a, b) => renewalEventDate(b).localeCompare(renewalEventDate(a)));
  const prescriptions = events.filter(event => isPrescriptionOnly(event) && renewalEventDate(event).slice(0, 10) <= today);
  const acquisitions = events.filter(event => !isPrescriptionOnly(event) && !isFutureAcquisition(event, today));
  const planned = events.filter(event => isFutureAcquisition(event, today));
  const latestPrescription = prescriptions[0] ?? null;
  const latestAcquisition = acquisitions[0] ?? null;
  const prescriptionOnFile = Boolean(latestPrescription &&
    (!latestAcquisition || renewalEventDate(latestPrescription) >= renewalEventDate(latestAcquisition)));
  const plannedAcquisition = planned[0] ?? null;
  const detail = `/saude/medicamentos/detalhes?id=${encodeURIComponent(id)}`;
  const acquisition = `/saude/renovacao/nova?medicamento_id=${encodeURIComponent(id)}&mode=acquisition&return_to=${encodeURIComponent(detail)}`;
  const prescription = `/saude/renovacao/nova-receita?medicamento_id=${encodeURIComponent(id)}&return_to=${encodeURIComponent(detail)}`;
  const withdrawal = input.withdrawal && input.withdrawal.status === "agendada" ? input.withdrawal : null;
  const journey = buildMedicationJourneySnapshot({
    medication,
    renewals: input.renewals,
    withdrawals: input.withdrawal ? [input.withdrawal] : [],
    today,
  });
  const evidence = medicationJourneyEvidence(journey);

  if (withdrawal && validDay(withdrawal.data)) {
    const overdue = withdrawal.data < today;
    return {
      stage: overdue ? "withdrawal_overdue" : "withdrawal_planned",
      label: overdue ? "Retirada atrasada" : "Retirada planejada",
      explanation: overdue
        ? `A retirada de ${withdrawal.data.split("-").reverse().join("/")} continua pendente. Reagendar preserva o histórico; receita e compra não são criadas automaticamente.`
        : `Há retirada agendada para ${withdrawal.data.split("-").reverse().join("/")}. O estoque só muda quando ela for concluída.`,
      actionLabel: overdue ? "Resolver retirada" : "Ver retirada",
      actionHref: `/saude/retiradas/detalhes?id=${encodeURIComponent(withdrawal.id || "")}`,
      evidence: [...evidence, `Retirada: ${withdrawal.data}`],
      prescriptionOnFile,
      plannedAcquisition: Boolean(plannedAcquisition),
    };
  }

  if (plannedAcquisition) {
    const day = renewalEventDate(plannedAcquisition).slice(0, 10);
    return {
      stage: "acquisition_planned", label: "Aquisição planejada",
      explanation: `Existe uma aquisição prevista para ${day.split("-").reverse().join("/")}. Ela ainda não conta como compra, gasto ou entrada no estoque.`,
      actionLabel: "Ver planejamento", actionHref: detail, evidence: [...evidence, `Próxima aquisição: ${day}`],
      prescriptionOnFile, plannedAcquisition: true,
    };
  }

  if (input.needsStock && prescriptionOnFile) {
    return {
      stage: "acquisition_needed", label: "Receita pronta · falta adquirir",
      explanation: "A receita mais recente já está registrada. A próxima etapa é registrar a compra ou retirada quando ela realmente acontecer.",
      actionLabel: "Registrar aquisição", actionHref: acquisition, evidence,
      prescriptionOnFile: true, plannedAcquisition: false,
    };
  }

  if (input.needsPrescription && !prescriptionOnFile) {
    return {
      stage: "prescription_needed", label: "Receita a renovar",
      explanation: "Não há receita posterior à última aquisição no histórico. Registre a receita quando recebê-la ou planeje a data sem movimentar estoque.",
      actionLabel: "Registrar receita", actionHref: prescription, evidence,
      prescriptionOnFile: false, plannedAcquisition: false,
    };
  }

  if (input.needsStock) {
    return {
      stage: "stock_review", label: "Estoque a conferir",
      explanation: "O estoque registrado pede conferência. Registre uma aquisição apenas se ela já aconteceu; planejamento futuro não altera o saldo.",
      actionLabel: "Revisar medicamento", actionHref: detail, evidence,
      prescriptionOnFile, plannedAcquisition: false,
    };
  }

  return {
    stage: "stable", label: "Continuidade acompanhada",
    explanation: "Não há uma próxima ação operacional comprovada neste momento.",
    actionLabel: "Ver medicamento", actionHref: detail, evidence,
    prescriptionOnFile, plannedAcquisition: false,
  };
}
