import type { RenovacaoInsight } from "./health-insights";

export type MedicationAccessActionKind =
  | "prescription"
  | "withdrawal"
  | "acquisition"
  | "review";

interface MedicationAccessContext {
  tipoUso?: string | null;
  tipoAquisicao?: string | null;
}

export interface MedicationAccessAction {
  kind: MedicationAccessActionKind;
  label: string;
  cta: string;
  description: string;
  href: string;
}

export function medicationAccessAction(
  insight: RenovacaoInsight,
  medicationId: string,
  returnTo: string,
  context: MedicationAccessContext = {}
): MedicationAccessAction | null {
  if (!insight.deveRenovar) return null;

  const medication = encodeURIComponent(medicationId);
  const back = encodeURIComponent(returnTo);
  const query = `medicamento_id=${medication}&return_to=${back}`;

  if (insight.motivo === "receita") {
    return {
      kind: "prescription",
      label: "Receita",
      cta: "Planejar receita",
      description: "Planejar uma nova receita",
      href: `/saude/renovacao/nova-receita?${query}`,
    };
  }

  const publicSupply =
    insight.motivo === "sus" ||
    context.tipoAquisicao === "sus";

  if (publicSupply) {
    return {
      kind: "withdrawal",
      label: "Retirada",
      cta: "Planejar retirada",
      description: "Planejar retirada e conferir documentos do serviço",
      href: `/saude/retiradas/nova?${query}`,
    };
  }

  const asNeeded =
    context.tipoUso === "sos" || context.tipoUso === "esporadico";

  if (asNeeded) {
    return {
      kind: "review",
      label: "Revisar",
      cta: "Revisar necessidade",
      description: "Revisar necessidade e opções de reposição",
      href: `/saude/medicamentos/detalhes?id=${medication}&return_to=${back}`,
    };
  }

  return {
    kind: "acquisition",
    label: "Reposição",
    cta: "Registrar aquisição",
    description: "Registrar compra ou outra aquisição",
    href: `/saude/renovacao/nova?${query}`,
  };
}
