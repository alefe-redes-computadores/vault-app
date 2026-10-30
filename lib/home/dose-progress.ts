import { normalizedMedicationSchedules } from "@/lib/medication-dose-history";

type MedicationShape = {
  id?: string;
  tipo_uso?: string;
  estoque_horarios?: string[];
  horarios?: string[];
};

type DoseLogShape = {
  medicamento_id?: string;
  horario?: string;
  dose_kind?: string;
  tomado_em?: string | null;
};

export function buildHomeDoseProgress(medications: MedicationShape[], logs: DoseLogShape[]) {
  const takenRoutineSlots = new Set(
    logs
      .filter(log => log.medicamento_id && log.horario && log.dose_kind !== "sos" && log.dose_kind !== "extra" && Boolean(log.tomado_em))
      .map(log => `${log.medicamento_id}-${log.horario}`)
  );
  let planned = 0;
  let taken = 0;
  for (const medication of medications) {
    if (!medication.id || medication.tipo_uso !== "continuo") continue;
    const schedules = normalizedMedicationSchedules(medication as any);
    planned += schedules.length;
    for (const time of schedules) if (takenRoutineSlots.has(`${medication.id}-${time}`)) taken += 1;
  }
  return {
    planned,
    taken,
    percentage: planned > 0 ? Math.min(100, Math.round((taken / planned) * 100)) : 0,
  };
}
