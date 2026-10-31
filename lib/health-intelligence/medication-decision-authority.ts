import type { MedicationCareStage } from "@/lib/health-intelligence/medication-care-decision";

/** Display-only authority. Never mutates a prescription, stock or dose. */
export type MedicationDecisionNotice = {
  label: string;
  meaning: string;
  tone: "attention" | "planning" | "neutral";
};

export function medicationDecisionNotice(stage: MedicationCareStage): MedicationDecisionNotice | null {
  switch (stage) {
    case "withdrawal_overdue":
      return { label: "Retirada em aberto", meaning: "Data vencida não comprova recebimento ou entrada no estoque.", tone: "attention" };
    case "withdrawal_planned":
      return { label: "Retirada prevista", meaning: "O estoque só muda quando a retirada for confirmada.", tone: "planning" };
    case "prescription_needed":
      return { label: "Receita a conferir", meaning: "Planejamento e recebimento de receita são eventos diferentes.", tone: "attention" };
    case "acquisition_needed":
      return { label: "Aquisição a conferir", meaning: "Receita cadastrada não comprova compra ou retirada.", tone: "attention" };
    case "acquisition_planned":
      return { label: "Aquisição futura", meaning: "Uma compra prevista não conta como aquisição, gasto nem estoque.", tone: "planning" };
    case "stock_review":
      return { label: "Saldo a revisar", meaning: "Estoque sem confirmação exige revisão, não baixa automática.", tone: "attention" };
    case "stable":
      return null;
  }
}
