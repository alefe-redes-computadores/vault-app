/**
 * M149: display order using the real person's selected-day dose logs.
 * For temporary courses, a planned log carries the daily clock; an ad-hoc
 * dose or an absent schedule NEVER fabricates a fixed administration time.
 * No dose status, record or stock is changed by this comparator.
 */
import { medicationFirstClockM148 } from "@/lib/health-intelligence/medication-list-sort-m148";

type MedicationRowM149 = {
  med: { id?: string | null; nome?: string | null; tipo_uso?: string | null;
    estoque_horarios?: readonly string[] | null };
};
type ScheduledLogM149 = {
  medicamento_id: string; horario?: string | null; dose_kind?: string | null;
};
const VALID_CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function createMedicationDayComparatorM149(logs: readonly ScheduledLogM149[]) {
  const temporaryHours = new Map<string, number>();
  for (const log of logs) {
    if (!log.medicamento_id || log.dose_kind !== "planned" ||
        !VALID_CLOCK.test(log.horario || "")) continue;
    const hour = log.horario!;
    const minutes = Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3, 5));
    const previous = temporaryHours.get(log.medicamento_id);
    if (previous === undefined || minutes < previous) temporaryHours.set(log.medicamento_id, minutes);
  }
  const clock = (row: MedicationRowM149) => {
    const med = row.med;
    return med.tipo_uso === "temporario"
      ? temporaryHours.get(med.id || "") ?? 1440
      : medicationFirstClockM148(med);
  };
  return (a: MedicationRowM149, b: MedicationRowM149): number =>
    clock(a) - clock(b) || String(a.med.nome || "").localeCompare(String(b.med.nome || ""), "pt-BR");
}
