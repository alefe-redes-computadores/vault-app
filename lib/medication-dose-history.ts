import {classifyDoseRealization} from './dose-slot-authority';
// lib/medication-dose-history.ts
import {historicalPharmaceuticalIdentity,type PharmaceuticalSnapshot} from './dose-premium/pharmaceutical-snapshot';
import { summarizeHistoricalQuantities, type DoseUnitFields } from "./dose-premium/historical-unit";

import type {
  DoseLog,
  Medicamento,
} from "@/lib/types";

export type DoseHistoryEventKind =
  | "scheduled_taken"
  | "scheduled_ignored"
  | "avulsa"
  | "planned"
  | "unknown_origin"
  | "conflict";

export type DoseHistoryEvent = Partial<DoseUnitFields> & {
  pharmaceuticalSnapshot?: PharmaceuticalSnapshot | null;
  id?: string;
  horario: string;
  tomadoEm?: string;
  ignoradoEm?: string;
  quantidade?: number;
  kind: DoseHistoryEventKind;
  origin?: "scheduled" | "sos" | "extra" | "planned";
  motivo?: string;
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
    quantityGroups: ReturnType<typeof summarizeHistoricalQuantities>["groups"];
    logsWithoutComparableQuantity:number;
    recordCoveragePercent: number | null;
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

function eventFromLog(log: DoseLog, duplicateRoutine:boolean): DoseHistoryEvent {
  const routine=log.dose_kind==='scheduled'||log.dose_kind==='planned';
  const independent=log.dose_kind==='sos'||log.dose_kind==='extra';
  const state=classifyDoseRealization(log).state;
  const conflict=state==='conflict'||state==='unknown'||duplicateRoutine;
  const kind:DoseHistoryEventKind=conflict?'conflict':routine?(state==='taken'?'scheduled_taken':state==='ignored'?'scheduled_ignored':'planned'):independent&&state==='taken'?'avulsa':'unknown_origin';
  return {pharmaceuticalSnapshot:historicalPharmaceuticalIdentity(log),id:log.id,horario:log.horario||"00:00",tomadoEm:log.tomado_em,ignoradoEm:log.ignorado_em,quantidade:log.quantidade,
    unidade_dose:log.unidade_dose,unidade_dose_rotulo:log.unidade_dose_rotulo,fonte_unidade:log.fonte_unidade,
    origin:log.dose_kind,motivo:log.motivo,kind};
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
    if (!log.data || log.medicamento_id !== medication.id || log.user_id!==medication.user_id || log.person_id!==medication.person_id) continue;
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
    const routineCounts=new Map<string,number>();
    for(const log of dayLogs)if(log.dose_kind==='scheduled'||log.dose_kind==='planned')routineCounts.set(log.horario,(routineCounts.get(log.horario)??0)+1);
    const events=dayLogs.map(log=>eventFromLog(log,(log.dose_kind==='scheduled'||log.dose_kind==='planned')&&(routineCounts.get(log.horario)??0)>1));
    const resolvedSlots=new Set(events.filter(event=>event.kind==='scheduled_taken'||event.kind==='scheduled_ignored').map(event=>event.horario));
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
    event.kind!=="conflict"&&classifyDoseRealization({tomado_em:event.tomadoEm,ignorado_em:event.ignoradoEm}).state==='taken'
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

  const quantitySummary=summarizeHistoricalQuantities(takenEvents);
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
      knownQuantity: quantitySummary.comparable?.quantity??0,
      quantityGroups:quantitySummary.groups,logsWithoutComparableQuantity:quantitySummary.unknown,
      logsWithoutQuantity: takenEvents.length - quantities.length,
      recordCoveragePercent: expected > 0
        ? Math.min(100, Math.round(((taken + ignored) / expected) * 100))
        : null,
    },
  };
}
