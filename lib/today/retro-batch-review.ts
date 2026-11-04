/** M62 — Revisão voluntária e auditável. Não escreve dados nem infere tomadas. */
import type { DoseLog, Medicamento } from "@/lib/types";
import { addDaysToLocalDate } from "@/lib/health-utils";

export type RetroSlotStatus = "unconfirmed" | "taken" | "ignored" | "conflict";
export type RetroSlot = {
  key: string;
  date: string;
  time: string;
  status: RetroSlotStatus;
  persisted: boolean;
};

export const MAX_RETRO_DAYS = 45;
export const MAX_RETRO_SLOTS = 240;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validRetroDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function retroScheduledTime(value: string): boolean {
  return HOUR.test(value);
}

export function retroSlotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

export function retroDateTimeISO(date: string, time: string): string {
  if (!validRetroDate(date) || !retroScheduledTime(time)) throw new Error("Dia ou horário histórico inválido.");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const moment = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (moment.getFullYear() !== year || moment.getMonth() !== month - 1 || moment.getDate() !== day || moment.getHours() !== hour || moment.getMinutes() !== minute || moment.getTime() > Date.now()) {
    throw new Error("O momento da tomada precisa ser uma data histórica válida.");
  }
  return moment.toISOString();
}

export function buildRetroBatchSlots(input: {
  medication: Medicamento;
  userId: string;
  personId: string;
  from: string;
  to: string;
  yesterday: string;
  logs: readonly DoseLog[];
  attestSchedule: boolean;
}): { slots: RetroSlot[]; days: number; error: string | null } {
  const { medication, userId, personId, from, to, yesterday, attestSchedule } = input;
  const empty = (error: string) => ({ slots: [], days: 0, error });
  if (!medication.id || medication.user_id !== userId || medication.person_id !== personId) return empty("Medicamento não pertence à pessoa selecionada.");
  if (medication.tipo_uso === "sos" || medication.tipo_uso === "esporadico") return empty("Doses SOS e avulsas exigem registro individual.");
  if (attestSchedule && (medication.tipo_uso === "temporario" || medication.status === "descontinuado")) {
    return empty("Tratamentos por período ou descontinuados exigem conferir o curso histórico individualmente: a rotina atual não prova horários antigos.");
  }
  if (!validRetroDate(from) || !validRetroDate(to) || !validRetroDate(yesterday) || from > to || to > yesterday) return empty("Escolha um período passado válido, até ontem.");
  const dates: string[] = [];
  for (let day = from; day <= to; day = addDaysToLocalDate(day, 1)) {
    dates.push(day);
    if (dates.length > MAX_RETRO_DAYS) return empty(`Revise no máximo ${MAX_RETRO_DAYS} dias por vez.`);
    if (!validRetroDate(day)) return empty("Não foi possível avançar no calendário.");
  }
  const bySlot = new Map<string, DoseLog[]>();
  for (const log of input.logs) {
    if (log.user_id !== userId || log.person_id !== personId || log.medicamento_id !== medication.id || log.data < from || log.data > to) continue;
    if (log.dose_kind === "sos" || log.dose_kind === "extra") continue;
    if (!retroScheduledTime(log.horario)) continue;
    const key = retroSlotKey(log.data, log.horario);
    const existing = bySlot.get(key);
    if (existing) existing.push(log); else bySlot.set(key, [log]);
  }
  // The current schedule is *never* projected backwards without user attestation.
  if (attestSchedule) {
    const schedule = [...new Set((medication.estoque_horarios ?? []).filter(retroScheduledTime))];
    if (!schedule.length) return empty("Este medicamento não tem horários configurados. Revise o histórico individual.");
    for (const day of dates) for (const time of schedule) {
      const key = retroSlotKey(day, time);
      if (!bySlot.has(key)) bySlot.set(key, []);
    }
  }
  if (bySlot.size > MAX_RETRO_SLOTS) return empty(`Há mais de ${MAX_RETRO_SLOTS} horários. Divida a revisão em períodos menores.`);
  const slots: RetroSlot[] = [...bySlot.entries()].map(([key, logs]) => {
    const [date, time] = key.split("|");
    const taken = logs.some(log => Boolean(log.tomado_em));
    const ignored = logs.some(log => Boolean(log.ignorado_em));
    const status: RetroSlotStatus = logs.length > 1 || (taken && ignored)
      ? "conflict" : taken ? "taken" : ignored ? "ignored" : "unconfirmed";
    return { key, date, time, status, persisted: logs.length > 0 };
  });
  slots.sort((a, b) => a.key.localeCompare(b.key));
  return { slots, days: dates.length, error: null };
}

/** Unit conversion stays exclusively in doseLogsRepository. Unknown ratios cannot debit in bulk. */
export function mayDebitHistoricalStock(medication: Medicamento): boolean {
  const stock = medication.estoque_quantidade;
  if (typeof stock !== "number" || !Number.isFinite(stock) || stock <= 0) return false;
  const unit = (medication.estoque_unidade_medida ?? "").trim().toLowerCase();
  const form = `${medication.formato ?? ""} ${medication.forma_farmaceutica ?? ""}`.toLowerCase();
  if (form.includes("gota")) {
    if (unit.includes("frasco")) return false; // canonical conversion cannot debit bottles from loose drops.
    if (unit.includes("gota")) return true;
    if (unit.includes("ml")) return typeof medication.estoque_gotas_por_ml === "number" && Number.isFinite(medication.estoque_gotas_por_ml) && medication.estoque_gotas_por_ml > 0;
    return false; // unknown drop units must never silently leave a debit unchanged.
  }
  return true;
}

export function retroReviewHref(medicationId: string, from?: string, stockMode: "added" | "counted" | "manual" = "manual"): string {
  const params = new URLSearchParams({ medicamento_id: medicationId, stock_mode: stockMode });
  if (from && validRetroDate(from)) params.set("data_aquisicao", from);
  return `/saude/medicamentos/revisao-retroativa?${params.toString()}`;
}
