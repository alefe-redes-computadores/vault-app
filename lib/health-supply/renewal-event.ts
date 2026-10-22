import type { Renovacao } from "@/lib/types";

/** Events without acquisition evidence represent a prescription on file. */
export function isPrescriptionOnly(event: Renovacao): boolean {
  return !event.tipo_aquisicao?.trim() && !event.data_aquisicao?.trim() &&
    event.quantidade == null && event.preco == null;
}

export function renewalEventDate(event: Renovacao): string {
  return event.data_aquisicao?.trim() || event.data?.trim() || event.created_at?.trim() || "";
}

export function renewalEventKind(event: Renovacao): "receita" | "aquisicao" {
  return isPrescriptionOnly(event) ? "receita" : "aquisicao";
}

/** V221: uma data de aquisicao futura e planejamento, nao compra realizada. */
export function isFutureAcquisition(event: Renovacao, todayISO: string): boolean {
  if (isPrescriptionOnly(event)) return false;
  const raw = renewalEventDate(event);
  // Datas legadas sem formato ISO continuam visiveis, mas nao sao reinterpretadas.
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/.exec(raw);
  return Boolean(match && /^\d{4}-\d{2}-\d{2}$/.test(todayISO) && match[1] > todayISO);
}

/** Total REALIZADO; nao considera receita, compra futura, SUS nem valor invalido. */
export function realizedAcquisitionExpense(event: Renovacao, todayISO: string): number {
  if (isPrescriptionOnly(event) || isFutureAcquisition(event, todayISO)) return 0;
  if (event.tipo_aquisicao === "sus" || event.tipo_aquisicao === "gratuito") return 0;
  const total = event.preco;
  return typeof total === "number" && Number.isFinite(total) && total > 0 ? total : 0;
}
