import type { RenovacaoInsight } from "./health-insights";
import type { Retirada } from "./types";

/** Apenas compromissos em aberto; nunca cria outro para resolver o mesmo evento. */
export function scheduledWithdrawalForMedication(rows: Retirada[], medicationId: string): Retirada | null {
  let earliest: Retirada | null = null;
  for (const row of rows) {
    if (!row.id || row.medicamento_id !== medicationId || row.status !== "agendada") continue;
    if (!earliest || row.data < earliest.data || (row.data === earliest.data && (row.horario || "23:59") < (earliest.horario || "23:59"))) earliest = row;
  }
  return earliest;
}

/** Index active commitments once for lists and dashboards. Overdue stays active. */
export function indexScheduledWithdrawals(rows: Retirada[]): Map<string, Retirada> {
  const result = new Map<string, Retirada>();
  for (const row of rows) {
    if (!row.id || !row.medicamento_id || row.status !== "agendada") continue;
    const current = result.get(row.medicamento_id);
    if (!current || row.data < current.data || (row.data === current.data && (row.horario || "23:59") < (current.horario || "23:59"))) result.set(row.medicamento_id, row);
  }
  return result;
}

export type MedicationAccessActionKind =
  | "prescription"
  | "withdrawal"
  | "acquisition"
  | "review";

interface MedicationAccessContext {
  tipoUso?: string | null;
  tipoAquisicao?: string | null;
  scheduledWithdrawalId?: string | null;
}

export interface MedicationAccessAction {
  kind: MedicationAccessActionKind;
  label: string;
  cta: string;
  description: string;
  href: string;
}

/** Copy follows the actual next action, never an unrelated renewal date. */
export function medicationAccessAlertTitle(action: MedicationAccessAction, days: number | null): string {
  if (action.kind === "prescription") return days === 0 ? "Solicitar receita hoje" : days !== null && days < 0 ? "Receita pendente" : "Planejar receita";
  if (action.kind === "withdrawal") return action.cta === "Ver retirada pendente" ? "Retirada pendente" : action.label === "Reposição" ? "Planejar reposição" : "Planejar retirada";
  if (action.kind === "acquisition") return "Registrar aquisição";
  return "Revisar necessidade";
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

  if (context.scheduledWithdrawalId && (insight.motivo === "sus" || insight.motivo === "estoque")) {
    return {
      kind: "withdrawal",
      label: "Retirada",
      cta: "Ver retirada pendente",
      description: "Abrir o compromisso existente para concluir ou reagendar",
      href: `/saude/retiradas/detalhes?id=${encodeURIComponent(context.scheduledWithdrawalId)}&return_to=${back}`,
    };
  }

  if (insight.motivo === "receita") {
    return {
      kind: "prescription",
      label: "Receita",
      cta: "Planejar receita",
      description: "Planejar uma nova receita",
      href: `/saude/renovacao/nova-receita?${query}&mode=plan`,
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
    if (insight.motivo === "estoque") {
      return {
        kind: "withdrawal",
        label: "Reposição",
        cta: "Planejar reposição",
        description: "Agendar a compra ou retirada sem antecipar entrada no estoque",
        href: `/saude/retiradas/nova?${query}`,
      };
    }
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
