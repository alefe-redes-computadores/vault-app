/** D4 P5: prévia pura que espelha a autoridade de reconciliação dos DoseLogs.
 * Nunca grava, remove ou confirma eventos; apenas descreve possíveis efeitos.
 */
import { TEMPORARY_COURSE_PREFIX, temporaryCourseSlots, type TemporaryCourse } from "@/lib/health-supply/temporary-course";

export type TemporaryCourseRevisionLog = {
  user_id: string;
  person_id?: string | null;
  medicamento_id: string;
  data: string;
  horario: string;
  dose_kind?: string | null;
  motivo?: string | null;
  tomado_em?: string | null;
  ignorado_em?: string | null;
};
export type TemporaryCourseRevisionPreviewP5 = {
  scheduled: number;
  kept: number;
  created: number;
  cancelled: number;
  settledPreserved: number;
  conflicts: string[];
  firstSlots: string[];
  removedSlots: string[];
  addedSlots: string[];
  protectedSlots: string[];
};
export function previewTemporaryCourseRevisionD4P5(input: {
  userId: string; personId: string; medicationId: string;
  course: TemporaryCourse;
  logs: readonly TemporaryCourseRevisionLog[];
}): TemporaryCourseRevisionPreviewP5 {
  const { userId, personId, medicationId, course, logs } = input;
  if (!userId || !personId || !medicationId || !Array.isArray(logs)) throw new Error("Pessoa, proprietário e medicamento são obrigatórios.");
  const desired = temporaryCourseSlots(course);
  const selected = logs.filter(row => row.user_id === userId && row.person_id === personId && row.medicamento_id === medicationId);
  const isCourse = (row: TemporaryCourseRevisionLog) => row.dose_kind === "planned" && Boolean(row.motivo?.startsWith(TEMPORARY_COURSE_PREFIX));
  const pending = selected.filter(row => isCourse(row) && !row.tomado_em && !row.ignorado_em);
  const settled = selected.filter(row => isCourse(row) && Boolean(row.tomado_em || row.ignorado_em));
  const key = (row: Pick<TemporaryCourseRevisionLog, "data" | "horario">) => `${row.data}T${row.horario}`;
  const pendingKeys = new Set(pending.map(key));
  const settledKeys = new Set(settled.map(key));
  const desiredKeys = new Set(desired.map(row => `${row.date}T${row.time}`));
  const conflicts: string[] = [];
  if (pendingKeys.size !== pending.length) conflicts.push("Há agendamentos antigos duplicados. Confira o histórico antes de editar.");
  // Mesmo contrato usado por replaceTemporaryCourse: conflitos fora de pending e settled.
  for (const slot of desired) {
    const target = `${slot.date}T${slot.time}`;
    if (selected.some(row => key(row) === target && !pendingKeys.has(target) && !settledKeys.has(target))) {
      if (conflicts.length < 8) conflicts.push(`Já existe outro registro no horário ${slot.date} às ${slot.time}.`);
    }
  }
  return {
    scheduled: desired.length,
    kept: desired.filter(row => pendingKeys.has(`${row.date}T${row.time}`)).length,
    created: desired.filter(row => !pendingKeys.has(`${row.date}T${row.time}`) && !settledKeys.has(`${row.date}T${row.time}`)).length,
    cancelled: pending.filter(row => !desiredKeys.has(key(row))).length,
    settledPreserved: settled.length,
    conflicts,
    firstSlots: desired.slice(0, 3).map(row => `${row.date}T${row.time}`),
    removedSlots: pending.filter(row => !desiredKeys.has(key(row))).map(key).sort(),
    addedSlots: desired.filter(row => !pendingKeys.has(`${row.date}T${row.time}`) && !settledKeys.has(`${row.date}T${row.time}`))
      .map(row => `${row.date}T${row.time}`).sort(),
    protectedSlots: settled.map(key).sort(),
  };
}
