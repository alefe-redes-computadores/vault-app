// lib/medication-dose-history.ts

import type {
  DoseLog,
  Medicamento,
} from "@/lib/types";

export type DoseHistoryEventKind =
  | "scheduled_taken"
  | "scheduled_ignored"
  | "avulsa";

export type DoseHistoryEvent = {
  id?: string;
  horario: string;
  tomadoEm?: string;
  ignoradoEm?: string;
  quantidade?: number;
  kind: DoseHistoryEventKind;
};

export type DoseHistoryDay = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  future: boolean;
  beforeKnownRoutine: boolean;
  expectedSlots: string[];
  events: DoseHistoryEvent[];
  takenScheduled: number;
  ignoredScheduled: number;
  unconfirmed: number;
  avulsas: number;
};

export type DoseHistoryMonth = {
  monthKey: string;
  monthLabel: string;
  days: DoseHistoryDay[];
  summary: {
    expected: number;
    taken: number;
    ignored: number;
    unconfirmed: number;
    avulsas: number;
    knownQuantity: number;
    logsWithoutQuantity: number;
    adherencePercent: number | null;
  };
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localIso(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

function parseMonthKey(monthKey: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);

  if (!match) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;

  if (!Number.isInteger(year) || month < 0 || month > 11) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  }

  return new Date(year, month, 1, 12);
}

export function currentMonthKey(now: Date = new Date()): string {
  return [now.getFullYear(), pad(now.getMonth() + 1)].join("-");
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() + delta);
  return currentMonthKey(date);
}

export function normalizedMedicationSchedules(
  medication: Medicamento
): string[] {
  if (medication.tipo_uso === "sos") return [];

  return Array.from(
    new Set(
      (medication.estoque_horarios || [])
        .map((value) => String(value || "").trim())
        .filter((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    )
  ).sort();
}

function knownRoutineStart(medication: Medicamento): string | null {
  const candidates = [
    String(medication.created_at || "").slice(0, 10),
    medication.estoque_data_referencia,
    medication.data_receita,
  ];

  return (
    candidates.find((value) =>
      Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
    ) || null
  );
}

function eventFromLog(log: DoseLog, schedules: string[]): DoseHistoryEvent {
  const scheduled = schedules.includes(log.horario);

  return {
    id: log.id,
    horario: log.horario || "00:00",
    tomadoEm: log.tomado_em,
    ignoradoEm: log.ignorado_em,
    quantidade: log.quantidade,
    kind: scheduled
      ? log.tomado_em
        ? "scheduled_taken"
        : "scheduled_ignored"
      : "avulsa",
  };
}

export function buildMedicationDoseHistoryMonth({
  medication,
  logs,
  monthKey,
  today,
}: {
  medication: Medicamento;
  logs: DoseLog[];
  monthKey: string;
  today: string;
}): DoseHistoryMonth {
  const monthDate = parseMonthKey(monthKey);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1, 12);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());

  const schedules = normalizedMedicationSchedules(medication);
  const startDate = knownRoutineStart(medication);
  const endDate = medication.status === "descontinuado"
    ? medication.data_descontinuacao || null
    : today;

  const logsByDate = new Map<string, DoseLog[]>();

  for (const log of logs) {
    if (!log.data || log.medicamento_id !== medication.id) continue;
    const current = logsByDate.get(log.data) || [];
    current.push(log);
    logsByDate.set(log.data, current);
  }

  const days: DoseHistoryDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const cursor = new Date(gridStart);
    cursor.setDate(gridStart.getDate() + index);
    const date = localIso(cursor);
    const inMonth = cursor.getMonth() === month;
    const future = date > today;
    const beforeKnownRoutine = Boolean(startDate && date < startDate);
    const afterRoutine = !endDate || date > endDate;
    const canExpect =
      Boolean(startDate) &&
      schedules.length > 0 &&
      !future &&
      !beforeKnownRoutine &&
      !afterRoutine;

    const dayLogs = (logsByDate.get(date) || []).sort((a, b) =>
      String(a.horario || "00:00").localeCompare(String(b.horario || "00:00"))
    );
    const events = dayLogs.map((log) => eventFromLog(log, schedules));
    const resolvedSlots = new Set(
      dayLogs
        .filter((log) =>
          schedules.includes(log.horario) &&
          Boolean(log.tomado_em || log.ignorado_em)
        )
        .map((log) => log.horario)
    );
    const expectedSlots = canExpect ? schedules : [];

    days.push({
      date,
      dayNumber: cursor.getDate(),
      inMonth,
      future,
      beforeKnownRoutine,
      expectedSlots,
      events,
      takenScheduled: expectedSlots.filter((slot) =>
        events.some((event) => event.horario === slot && event.kind === "scheduled_taken")
      ).length,
      ignoredScheduled: expectedSlots.filter((slot) =>
        events.some((event) => event.horario === slot && event.kind === "scheduled_ignored")
      ).length,
      unconfirmed: expectedSlots.filter((slot) => !resolvedSlots.has(slot)).length,
      avulsas: events.filter((event) => event.kind === "avulsa").length,
    });
  }

  const monthDays = days.filter((day) => day.inMonth);
  const monthEvents = monthDays.flatMap((day) => day.events);
  const takenEvents = monthEvents.filter((event) =>
    event.kind === "scheduled_taken" || event.kind === "avulsa"
  );
  const expected = monthDays.reduce((total, day) => total + day.expectedSlots.length, 0);
  const taken = monthDays.reduce((total, day) => total + day.takenScheduled, 0);
  const ignored = monthDays.reduce((total, day) => total + day.ignoredScheduled, 0);
  const unconfirmed = monthDays.reduce((total, day) => total + day.unconfirmed, 0);
  const avulsas = monthDays.reduce((total, day) => total + day.avulsas, 0);
  const quantities = takenEvents
    .map((event) => event.quantidade)
    .filter((value): value is number =>
      typeof value === "number" && Number.isFinite(value) && value > 0
    );

  return {
    monthKey,
    monthLabel: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(monthDate),
    days,
    summary: {
      expected,
      taken,
      ignored,
      unconfirmed,
      avulsas,
      knownQuantity: quantities.reduce((total, value) => total + value, 0),
      logsWithoutQuantity: takenEvents.length - quantities.length,
      adherencePercent: expected > 0
        ? Math.min(100, Math.round((taken / expected) * 100))
        : null,
    },
  };
}
