import type { MedicationCareDecision } from "@/lib/health-intelligence/medication-care-decision";

export type MedicationCardAction = { href: string; label: string; description: string };

/**
 * Canonical evidence wins only when a generic Brain suggestion contradicts
 * an already registered acquisition/withdrawal step. All other Brain actions
 * keep their original priority. Does not change clinical data or write stock.
 */
export function resolveMedicationCardAction(
  decision: Pick<MedicationCareDecision, "stage" | "actionHref" | "actionLabel" | "explanation">,
  brainAction: MedicationCardAction | null,
  accessAction: MedicationCardAction | null,
): MedicationCardAction | null {
  const canonical: MedicationCardAction | null = decision.stage !== "stable"
    ? { href: decision.actionHref, label: decision.actionLabel, description: decision.explanation }
    : null;
  const brainRequestsPrescription = Boolean(brainAction &&
    (/nova-receita/i.test(brainAction.href) ||
      /(?:registrar|renovar|adicionar)\s+(?:nova\s+)?receita/i.test(brainAction.label)));
  const registeredNextStep = decision.stage === "acquisition_needed" ||
    decision.stage === "acquisition_planned" ||
    decision.stage === "withdrawal_overdue" ||
    decision.stage === "withdrawal_planned";
  if (brainRequestsPrescription && registeredNextStep && canonical) return canonical;
  return brainAction ?? canonical ?? accessAction;
}
