import { hasKnownEmptyMedicationStock } from "@/lib/medication-availability";
import { buildPendingDoseBacklog } from "@/lib/pending-dose-backlog";

type Entity = Record<string, any>;

export type HomePendingDose = {
  stockUnavailable: boolean;
  medicamentoId: string;
  nome: string;
  formato?: string;
  cores?: string[];
  data: string;
  horario: string;
  diaLabel: "Hoje" | "Ontem" | "Anterior";
};

type Input = {
  medications: Entity[];
  reviewLogs: Entity[];
  plannedEarlier: Entity[];
  yesterdayLogs: Entity[];
  todayLogs: Entity[];
  userId?: string;
  personId?: string;
  today: string;
  yesterday: string;
  currentTime: string;
};

const slotKey = (medicationId: string, date: string, time: string) => `${medicationId}|${date}|${time}`;

export function buildHomePendingDoseProjection(input: Input): HomePendingDose[] {
  const result: HomePendingDose[] = [];
  const seen = new Set<string>();
  const medicationById = new Map(input.medications
    .filter(med => med.id && med.person_id === input.personId && med.user_id === input.userId)
    .map(med => [med.id, med]));

  const append = (med: Entity, date: string, time: string, dayLabel: HomePendingDose["diaLabel"]) => {
    const key = slotKey(med.id, date, time);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      stockUnavailable: hasKnownEmptyMedicationStock(med), medicamentoId: med.id,
      nome: med.nome, formato: med.formato, cores: med.cores, data: date, horario: time, diaLabel: dayLabel,
    });
  };

  for (const slot of buildPendingDoseBacklog({
    medications: input.medications as any, logs: input.reviewLogs as any, userId: input.userId,
    personId: input.personId, today: input.today, currentTime: input.currentTime, lookbackDays: 7,
  })) {
    const med = medicationById.get(slot.medicamentoId);
    if (med) append(med, slot.data, slot.horario, slot.diaLabel);
  }

  for (const log of input.plannedEarlier) {
    if (!log.id || !log.medicamento_id) continue;
    const med = medicationById.get(log.medicamento_id);
    if (med) append(med, log.data, log.horario, "Anterior");
  }

  for (const [date, logs, dayLabel] of [
    [input.yesterday, input.yesterdayLogs, "Ontem"],
    [input.today, input.todayLogs, "Hoje"],
  ] as const) for (const log of logs) {
    if (log.dose_kind !== "planned" || log.tomado_em || log.ignorado_em || !log.id || !log.medicamento_id
      || log.data !== date || (date === input.today && log.horario > input.currentTime)) continue;
    const med = medicationById.get(log.medicamento_id);
    if (med) append(med, date, log.horario, dayLabel);
  }
  return result;
}
