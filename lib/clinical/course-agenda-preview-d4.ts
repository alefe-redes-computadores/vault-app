/** D4 P3 - visualizacao pura da agenda de cursos finitos.
 * Autoridade das datas = DoseLogs explicitamente planejados + nota canônica.
 * A função nao consulta, agenda ou cancela notificações nativas.
 */
import type { DoseLog } from "@/lib/types";
import { parseTemporaryCourseNote, temporaryCourseEnd, temporaryCourseSlots } from "@/lib/health-supply/temporary-course";
import { latestCourseDecisionD4 } from "@/lib/clinical/course-decision-view-d4";
import type { MedicationClinicalContextM1 } from "@/lib/clinical/episode-m1";

export type CourseAgendaModeD4 = "ready" | "review" | "declared";
export type CourseAgendaSlotD4 = { date: string; time: string; key: string };
export type CourseAgendaPreviewD4 = {
  mode: CourseAgendaModeD4;
  next: CourseAgendaSlotD4[];
  futureInWindow: number;
  futureBeyondWindow: number;
  alreadyDue: number;
  settled: number;
  windowDays: number;
  declared: "conclusao_relatada" | "interrupcao_relatada" | null;
  warning: string | null;
};
type Row = Pick<DoseLog, "user_id" | "person_id" | "medicamento_id" | "dose_kind" | "motivo" | "data" | "horario" | "tomado_em" | "ignorado_em">;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = 86400000;
function numberDay(value: string): number | null {
  const m = DATE.exec(value);
  if (!m) return null;
  const y = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const stamp = Date.UTC(y, month - 1, day, 12);
  const dt = new Date(stamp);
  return y >= 1000 && y <= 9999 && dt.getUTCFullYear() === y && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day
    ? Math.floor(stamp / DAY) : null;
}
export function buildCourseAgendaPreviewD4(input: {
  userId: string; personId: string; medicationId: string;
  courseKey: string; today: string; localTime: string;
  logs: readonly Row[];
  context?: MedicationClinicalContextM1 | null;
  windowDays?: number;
}): CourseAgendaPreviewD4 | null {
  const { userId, personId, medicationId, courseKey, today, localTime, logs, context } = input;
  const todayDay = numberDay(today);
  if (!userId || !personId || !medicationId || !courseKey.startsWith(`${medicationId}|`) ||
      todayDay === null || !TIME.test(localTime) || !Array.isArray(logs)) return null;
  const note = courseKey.slice(medicationId.length + 1);
  if (!note.startsWith("Tratamento temporário · ")) return null;
  const rows = logs.filter(log => log.user_id === userId && log.person_id === personId &&
    log.medicamento_id === medicationId && log.dose_kind === "planned" && log.motivo === note);
  if (!rows.length) return null;
  const selectedWindow = input.windowDays ?? 7;
  if (!Number.isInteger(selectedWindow) || selectedWindow < 1 || selectedWindow > 30) return null;
  const decision = latestCourseDecisionD4(context, courseKey);
  let invalid = false;
  let start: string | null = null, end: string | null = null;
  let expectedInterval: Set<string> | null = null;
  const parsed = parseTemporaryCourseNote(note);
  if (!parsed) invalid = true;
  else {
    try {
      start = parsed.start;
      end = temporaryCourseEnd({ ...parsed, times: parsed.intervalHours ? [] : [parsed.firstPlannedAt?.slice(11) || "00:00"] });
      if (parsed.intervalHours) expectedInterval = new Set(
        temporaryCourseSlots({ ...parsed, times: [] }).map(s => `${s.date}|${s.time}`));
    } catch { invalid = true; }
  }
  const unique = new Set<string>();
  const future: CourseAgendaSlotD4[] = [];
  let alreadyDue = 0, settled = 0;
  for (const row of rows) {
    const day = numberDay(row.data);
    const key = `${row.data}|${row.horario}`;
    if (day === null || !TIME.test(row.horario) || unique.has(key) || (start && end && (row.data < start || row.data > end)) ||
        (parsed?.firstPlannedAt && `${row.data}T${row.horario}` < parsed.firstPlannedAt) ||
        (expectedInterval !== null && !expectedInterval.has(key)) || Boolean(row.tomado_em && row.ignorado_em)) {
      invalid = true;
      continue;
    }
    unique.add(key);
    if (row.tomado_em || row.ignorado_em) { settled++; continue; }
    if (day! < todayDay || (day === todayDay && row.horario < localTime)) { alreadyDue++; continue; }
    future.push({ date: row.data, time: row.horario, key });
  }
  future.sort((a,b) => a.key.localeCompare(b.key));
  const within = future.filter(x => (numberDay(x.date)! - todayDay) < selectedWindow);
  const beyond = future.length - within.length;
  const declared = decision?.tipo ?? null;
  const mode: CourseAgendaModeD4 = invalid ? "review" : declared ? "declared" : "ready";
  const warning = invalid ? "Há horários inválidos, repetidos ou incompatíveis. Confira a agenda antes de confiar na prévia." :
    declared ? "Existe uma declaração de conclusão ou interrupção. Ela não cancelou automaticamente os horários ou notificações." : null;
  return { mode, next: within.slice(0,3), futureInWindow: within.length,
    futureBeyondWindow: beyond, alreadyDue, settled, windowDays: selectedWindow, declared, warning };
}
