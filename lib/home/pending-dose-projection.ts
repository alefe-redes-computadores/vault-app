import { hasKnownEmptyMedicationStock } from "@/lib/medication-availability";
import { buildPendingDoseBacklog } from "@/lib/pending-dose-backlog";
import { buildDoseSlotIndex, doseSlotIsResolved, resolveDoseSlot } from "@/lib/dose-slot-authority";

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

  // P7: os logs explícitos são a autoridade para SOS/avulso planejado.
  // Se dois medicamentos compartilham 23:00, cada ID mantém seu slot.
  // Nunca fabricamos obrigação de SOS a partir de um simples horário no cadastro.
  const explicitLogs = [
    ...input.reviewLogs,
    ...input.plannedEarlier,
    ...input.yesterdayLogs,
    ...input.todayLogs,
  ];
  // P8: snapshots repetidos dos hooks não precisam percorrer a fila 2x.
  // A autoridade de desfecho continua no índice canônico de slots.
  const seenExplicitLogIds = new Set<string>();
  const explicitIndex = buildDoseSlotIndex(explicitLogs as any, {
    userId: input.userId, personId: input.personId,
  });
  const validDay = /^\d{4}-\d{2}-\d{2}$/;
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const log of explicitLogs) {
    if (log.id && seenExplicitLogIds.has(String(log.id))) continue;
    if (log.id) seenExplicitLogIds.add(String(log.id));
    const med = medicationById.get(log.medicamento_id);
    if (!med || !validDay.test(String(log.data || ""))) continue;
    const time = String(log.horario || "").slice(0, 5);
    if (!validTime.test(time)) continue;
    if (log.user_id !== input.userId || log.person_id !== input.personId) continue;
    const isScheduledSOS = (med.tipo_uso === "sos" || med.tipo_uso === "esporadico")
      && log.dose_kind === "scheduled";
    // V347: planejada somente sem desfecho. SOS com slot scheduled explicito
    // tambem entra, sem tornar todos os horarios de SOS obrigatorios.
    if (log.dose_kind !== "planned" && !isScheduledSOS) continue;
    if (log.tomado_em || log.ignorado_em) continue;
    const date = log.data;
    // V347: nenhum horario futuro deve entrar em Pendentes.
    if (date > input.today || (date === input.today && log.horario > input.currentTime)) continue;
    if (doseSlotIsResolved(resolveDoseSlot(explicitIndex, med.id, log.data, time))) continue;
    const dayLabel: HomePendingDose["diaLabel"] = log.data === input.today
      ? "Hoje" : log.data === input.yesterday ? "Ontem" : "Anterior";
    append(med, log.data, time, dayLabel);
  }
  // Ordem previsível para a revisão e para toques de notificações agrupadas.
  result.sort((a,b) => a.data.localeCompare(b.data)
    || a.horario.localeCompare(b.horario) || a.medicamentoId.localeCompare(b.medicamentoId));
  return result;
}
