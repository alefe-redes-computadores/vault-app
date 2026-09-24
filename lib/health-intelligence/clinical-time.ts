// lib/health-intelligence/clinical-time.ts
// VAULT_CLINICAL_TIME_V48
//
// Separa quatro conceitos que não podem ser misturados:
// 1) data do evento;
// 2) horário programado;
// 3) momento real informado;
// 4) timestamp técnico de registro.
//
// Não usa created_at/updated_at como substituto silencioso de evento clínico.

export type ClinicalTimeBucket =
  | "past"
  | "now"
  | "upcoming"
  | "future-day"
  | "past-day"
  | "unknown";

export interface ClinicalEventTimes {
  eventDate: string | null;
  scheduledTime: string | null;
  actualAt: string | null;
  recordedAt: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normalizeClinicalDate(value?: string | null): string | null {
  const safe = String(value || "").slice(0, 10);
  return DATE_RE.test(safe) ? safe : null;
}

export function normalizeClinicalTime(value?: string | null): string | null {
  const safe = String(value || "").trim().slice(0, 5);
  return TIME_RE.test(safe) ? safe : null;
}

export function buildClinicalEventTimes(input: {
  eventDate?: string | null;
  scheduledTime?: string | null;
  actualAt?: string | null;
  recordedAt?: string | null;
}): ClinicalEventTimes {
  return {
    eventDate: normalizeClinicalDate(input.eventDate),
    scheduledTime: normalizeClinicalTime(input.scheduledTime),
    actualAt: input.actualAt || null,
    recordedAt: input.recordedAt || null,
  };
}

export function minutesFromClock(value: string): number | null {
  const safe = normalizeClinicalTime(value);
  if (!safe) return null;
  const [h, m] = safe.split(":").map(Number);
  return h * 60 + m;
}

export function classifyClinicalSchedule(input: {
  eventDate: string;
  scheduledTime?: string | null;
  today: string;
  nowTime: string;
  nowWindowMinutes?: number;
}): ClinicalTimeBucket {
  const eventDate = normalizeClinicalDate(input.eventDate);
  const today = normalizeClinicalDate(input.today);
  if (!eventDate || !today) return "unknown";

  if (eventDate < today) return "past-day";
  if (eventDate > today) return "future-day";

  const scheduled = input.scheduledTime
    ? minutesFromClock(input.scheduledTime)
    : null;
  const now = minutesFromClock(input.nowTime);
  if (scheduled === null || now === null) return "unknown";

  const windowMinutes = Math.max(0, input.nowWindowMinutes ?? 15);
  const delta = scheduled - now;

  if (Math.abs(delta) <= windowMinutes) return "now";
  return delta < 0 ? "past" : "upcoming";
}
