import type { RetiradaStatus } from "@/lib/types";

/** Operações de visualização. Não alteram autoridade nem persistência clínica. */
export function normalizeCareSearch(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

/** Todos os termos precisam aparecer, independente de acentos ou ordem. */
export function matchesCareSearch(query: string, ...fields: unknown[]): boolean {
  const terms = normalizeCareSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalizeCareSearch(fields.join(" "));
  return terms.every(term => haystack.includes(term));
}

export type WithdrawalProgress = {
  scheduled: number;
  overdue: number;
  realized: number;
  cancelled: number;
  notRealized: number;
};

/** Apenas status 'realizada' comprova retirada; data vencida sozinha não a conclui. */
export function summarizeWithdrawalProgress(
  items: readonly { status: RetiradaStatus; data: string }[], todayISO: string,
): WithdrawalProgress {
  const result: WithdrawalProgress = { scheduled: 0, overdue: 0, realized: 0, cancelled: 0, notRealized: 0 };
  for (const item of items) {
    if (item.status === "realizada") result.realized++;
    else if (item.status === "cancelada") result.cancelled++;
    else if (item.status === "nao_realizada") result.notRealized++;
    else if (item.status === "agendada") {
      if (/^\d{4}-\d{2}-\d{2}/.test(item.data) && item.data.slice(0, 10) < todayISO) result.overdue++;
      else result.scheduled++;
    }
  }
  return result;
}
