/**
 * P8 — Leitura de evidências temporais, nunca uma prescrição ou comando clínico.
 * Não cria doses, não muda estoque, não interpreta SOS como obrigação.
 */
export type PendingTimeEvidence = {
  day: string;
  dayLabel: "Hoje" | "Ontem" | "Anterior";
  time: string;
  medications: number;
  medicationNames: string[];
  withoutRecordedStock: number;
};

type PendingEvidenceInput = {
  medicamentoId: string;
  nome: string;
  data: string;
  horario: string;
  diaLabel: "Hoje" | "Ontem" | "Anterior";
  stockUnavailable?: boolean;
};

/** Distintos por medicamento+dia+horário; horários iguais não colapsam IDs. */
export function summarizePendingTimeGroups(
  doses: readonly PendingEvidenceInput[],
): PendingTimeEvidence[] {
  const groups = new Map<string, { day: string; dayLabel: PendingTimeEvidence["dayLabel"]; time: string; names: Map<string, string>; lowStock: Set<string> }>();
  const validDay = /^\d{4}-\d{2}-\d{2}$/;
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const dose of doses) {
    if (!dose.medicamentoId || !validDay.test(dose.data) || !validTime.test(dose.horario)) continue;
    const key = `${dose.data}|${dose.horario}`;
    let item = groups.get(key);
    if (!item) {
      item = { day: dose.data, dayLabel: dose.diaLabel, time: dose.horario, names: new Map(), lowStock: new Set() };
      groups.set(key, item);
    }
    if (!item.names.has(dose.medicamentoId)) item.names.set(dose.medicamentoId, dose.nome);
    if (dose.stockUnavailable) item.lowStock.add(dose.medicamentoId);
  }
  return [...groups.values()]
    .sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time))
    .map(item => ({
      day: item.day, dayLabel: item.dayLabel, time: item.time,
      medications: item.names.size,
      medicationNames: [...item.names.values()],
      withoutRecordedStock: item.lowStock.size,
    }));
}
