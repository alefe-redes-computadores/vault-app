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
    decision.stage === "withdrawal_planned" ||
    // R9 R3: uma revisão documental comprovada não vira pedido automático
    // de nova receita apenas por sugestão genérica do Brain.
    (decision.stage === "stock_review" && decision.actionLabel === "Conferir receita");
  // A01: sugestão clínica nunca cai no Cofre Pessoal por erro de destino.
  // Somente intercepta texto inequivocamente clínico que aponta a documentos
  // PESSOAIS; pesquisa de RG/senhas/documentos pessoais fica intacta.
  const asksForClinicalAttachment = Boolean(brainAction &&
    /(?:receita|prescri(?:ção|cao)|anexar.*(?:laudo|exame|documento de sa[uú]de)|vincular.*(?:laudo|documento de sa[uú]de))/i.test(`${brainAction.label} ${brainAction.description}`));
  const accidentallyPersonal = Boolean(brainAction && /^\/(?:documentos|galeria)(?:\/|\?|#|$)/i.test(brainAction.href));
  if (asksForClinicalAttachment && accidentallyPersonal) {
    const prescription = /(?:receita|prescri(?:ção|cao))/i.test(`${brainAction!.label} ${brainAction!.description}`);
    const canonicalClinical = canonical?.href.startsWith("/saude/renovacao/nova-receita") ? canonical : null;
    return canonicalClinical || (prescription
      ? { href: "/saude/renovacao", label: "Conferir receitas clínicas", description: "Escolher medicamento e verificar o vínculo antes de anexar; sem gravar uma nova receita automaticamente." }
      : { href: "/saude/documentos", label: "Abrir documentos de saúde", description: "Escolher o documento clínico correto; sem criar vínculos automaticamente." });
  }
  if (brainRequestsPrescription && registeredNextStep && canonical) return canonical;
  return brainAction ?? canonical ?? accessAction;
}
