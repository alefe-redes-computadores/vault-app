import type { Retirada } from "./types";

/** Append only, including edits outside the detail screen. Never trust a replacement history. */
export function withdrawalHistory(current: Retirada, next: Retirada, timestamp: string, reason?: string | null) {
  const history = current.reagendamentos || [];
  if (current.data === next.data && (current.horario || null) === (next.horario || null)) return history;
  if (current.status !== "agendada" || next.status !== "agendada") return history;
  return [...history, {data_anterior: current.data, horario_anterior: current.horario || null,
    nova_data: next.data, novo_horario: next.horario || null, motivo: reason?.trim() || null, reagendada_em: timestamp}];
}
