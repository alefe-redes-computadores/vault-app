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
