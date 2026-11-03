import type { Medicamento, Renovacao, Retirada } from "@/lib/types";
import { isFutureAcquisition, isPrescriptionOnly, renewalEventDate } from "@/lib/health-supply/renewal-event";
import { buildMedicationJourneySnapshot, medicationJourneyEvidence } from "@/lib/health-intelligence/medication-workspace";
import { getClinicalStockSnapshot } from "@/lib/health-intelligence/clinical-stock";
import { medicationRestockHref, medicationStockCountHref } from "@/lib/health-intelligence/medication-restock-navigation";

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
  const planning = medicationCareStageIsPlanning(decision.stage);
  const stable = decision.stage === "stable";
  // Future planning and stable states cannot be promoted to clinical emergency by a legacy hint.
  const critical = decision.stage === "withdrawal_overdue" || (!planning && !stable && urgency === "alta");
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
  // V329: registered history is not proof of present regulatory validity.
  // A prescription older than the last purchase must not disappear from the UI,
  // and must not be automatically declared current either.
  const prescriptionOnFile = Boolean(latestPrescription &&
    (!latestAcquisition || renewalEventDate(latestPrescription) >= renewalEventDate(latestAcquisition)));
  const hasRegisteredPrescription = Boolean(latestPrescription);
  // R9 R3: a referência direta ao documento é uma pista para revisar,
  // nunca uma prova de validade, natureza do arquivo ou titularidade documental.
  const hasLinkedDocument = Boolean(medication.document_id?.trim());
  const plannedAcquisition = planned[0] ?? null;
  const detail = `/saude/medicamentos/detalhes?id=${encodeURIComponent(id)}`;
  const acquisition = medicationRestockHref(id, detail);
  const reviewStock = medicationStockCountHref(id, detail);
  const stockState = getClinicalStockSnapshot(medication).state;
  const noStockConfirmed = stockState === "empty";
  const stockNeedsCorrection = stockState === "negative";
  const prescription = `/saude/renovacao/nova-receita?medicamento_id=${encodeURIComponent(id)}&return_to=${encodeURIComponent(detail)}`;
  // A withdrawal from another person must never hide the correct next step.
  const withdrawal = input.withdrawal && input.withdrawal.status === "agendada" &&
    input.withdrawal.medicamento_id === id &&
    input.withdrawal.user_id === medication.user_id &&
    input.withdrawal.person_id === medication.person_id
    ? input.withdrawal : null;
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

  if (input.needsStock && (stockState === "unknown" || stockNeedsCorrection)) {
    return {
      stage: "stock_review",
      label: stockNeedsCorrection ? "Saldo de estoque divergente" : "Estoque não informado",
      explanation: stockNeedsCorrection
        ? "O saldo registrado é negativo. Confira a contagem antes de planejar a reposição; não vamos ocultar a divergência."
        : "Ainda não existe contagem de saldo. Informe a quantidade disponível; receita e compra não comprovam o estoque atual.",
      actionLabel: stockNeedsCorrection ? "Revisar saldo" : "Informar saldo", actionHref: reviewStock,
      evidence: [...evidence, stockNeedsCorrection ? "Saldo negativo no cadastro" : "Saldo ainda não informado"],
      prescriptionOnFile, plannedAcquisition: false,
    };
  }

  // Saldo ainda positivo exige planejamento/revisão, não um formulário de compra realizada.
  if (input.needsStock && !noStockConfirmed) {
    return {
      stage: "stock_review", label: "Estoque a acompanhar",
      explanation: "Ainda existe saldo registrado. Confira a rotina e planeje uma próxima compra ou retirada sem criar aquisição antecipada.",
      actionLabel: "Ver estoque", actionHref: detail, evidence,
      prescriptionOnFile, plannedAcquisition: false,
    };
  }

  if (input.needsStock && hasRegisteredPrescription) {
    const currentByHistory = prescriptionOnFile;
    return {
      stage: "acquisition_needed",
      label: currentByHistory ? "Sem estoque · receita registrada" : "Sem estoque · revisar receita",
      explanation: currentByHistory
        ? "Existe receita registrada no histórico. Confira a validade e a exigência do canal antes de adquirir; registre uma aquisição somente se ela realmente ocorreu."
        : "Já existe uma receita registrada, anterior à última aquisição. Isso não comprova que esteja válida agora. Confira a exigência aplicável e registre uma nova aquisição somente se ela realmente ocorreu; não duplique a receita por causa do alerta de estoque.",
      actionLabel: noStockConfirmed ? "Repor estoque" : "Planejar reposição",
      actionHref: acquisition,
      evidence: [...evidence, currentByHistory ? "Receita registrada · conferir validade" : "Receita registrada anteriormente · validade não inferida"],
      prescriptionOnFile: currentByHistory,
      plannedAcquisition: false,
    };
  }

  // R9 R3: vínculo de documento e receita histórica são evidências diferentes.
  // O vínculo evita sugerir duplicação automática; sua validade precisa de revisão.
  if (input.needsStock && hasLinkedDocument) {
    return {
      stage: "acquisition_needed", label: "Documento vinculado · estoque a revisar",
      explanation: "Há referência documental vinculada ao medicamento. Confira se é a receita correta, a pessoa, a validade e o canal de fornecimento. O saldo exige revisão; compra planejada não é compra realizada.",
      actionLabel: noStockConfirmed ? "Repor estoque" : "Planejar reposição", actionHref: acquisition,
      evidence: [...evidence, "Documento vinculado no cadastro; conteúdo e validade não verificados"],
      prescriptionOnFile: false, plannedAcquisition: false,
    };
  }

  if (input.needsPrescription && hasLinkedDocument) {
    return {
      stage: "stock_review", label: "Documento vinculado · verificar receita",
      explanation: "O cadastro tem um documento vinculado. Confira o tipo de documento, a titularidade, a validade e a exigência vigente antes de solicitar nova receita.",
      actionLabel: "Conferir receita", actionHref: detail,
      evidence: [...evidence, "Vínculo documental presente; validade e conteúdo não inferidos"],
      prescriptionOnFile: false, plannedAcquisition: false,
    };
  }

  // With a prior recorded prescription, a general renewal hint is not enough
  // evidence to demand the same document again. Offer review, not duplication.
  if (input.needsPrescription && !prescriptionOnFile && hasRegisteredPrescription) {
    return {
      stage: "stock_review", label: "Receita no histórico · revisar validade",
      explanation: "Existe receita registrada anteriormente. Confira a validade e as exigências atuais antes de decidir por nova prescrição ou aquisição; a data isolada não comprova validade.",
      actionLabel: "Conferir receita", actionHref: detail,
      evidence: [...evidence, "Receita anterior registrada; validade atual não inferida"],
      prescriptionOnFile: false, plannedAcquisition: false,
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
      stage: "stock_review", label: noStockConfirmed ? "Sem estoque registrado" : "Estoque a conferir",
      explanation: noStockConfirmed
        ? "O saldo confirmado chegou a zero. Registre uma compra ou retirada apenas quando realmente ocorrer."
        : "O estoque pede conferência ou planejamento. Registre compra e retirada apenas depois de realizadas.",
      actionLabel: noStockConfirmed ? "Repor estoque" : "Ver estoque", actionHref: noStockConfirmed ? acquisition : detail, evidence,
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
