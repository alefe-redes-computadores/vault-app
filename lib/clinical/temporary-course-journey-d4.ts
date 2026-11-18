/** D4 P1 — painel de leitura baseado exclusivamente em DoseLogs canônicos.
 * Nunca decide conclusão, adesão, interrupção, dose ou necessidade clínica.
 * A agenda permanece propriedade de lib/health-supply/temporary-course e doseLogs.
 */
import type { DoseLog } from "@/lib/types";
import { parseTemporaryCourseNote, temporaryCourseEnd } from "@/lib/health-supply/temporary-course";

export type CourseJourneyPhaseD4 = "future" | "within_period" | "period_elapsed" | "review_dates";
export type CourseJourneyD4 = {
  courseKey: string;
  phase: CourseJourneyPhaseD4;
  start: string | null;
  through: string | null;
  currentDay: number | null;
  totalDays: number | null;
  usesHourInterval: boolean;
  scheduled: number;
  confirmed: number;
  ignored: number;
  futurePending: number;
  todayPending: number;
  earlierPending: number;
  conflicted: boolean;
  warning: string | null;
};

type ReadableDose = Pick<DoseLog,
  "user_id" | "person_id" | "medicamento_id" | "dose_kind" | "motivo" | "data" | "horario" | "tomado_em" | "ignorado_em" | "id">;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY = 86400000;
function dayNumber(date: string): number | null {
  if (!DATE.test(date)) return null;
  const [y,m,d] = date.split("-").map(Number);
  const epoch = Date.UTC(y,m-1,d,12,0,0);
  const dt = new Date(epoch);
  if (!Number.isFinite(epoch) || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m-1 || dt.getUTCDate() !== d) return null;
  return Math.floor(epoch / DAY);
}
/** Key is already canonical in temporaryCourseSummaries: `${medicationId}|${motivo}`. */
export function buildCourseJourneyD4(input: {
  userId: string;
  personId: string;
  medicationId: string;
  courseKey: string;
  today: string;
  logs: readonly ReadableDose[];
}): CourseJourneyD4 | null {
  const { userId, personId, medicationId, courseKey, today, logs } = input;
  if (!userId || !personId || !medicationId || !courseKey || !courseKey.startsWith(`${medicationId}|`) || dayNumber(today) === null) return null;
  const note = courseKey.slice(medicationId.length + 1);
  if (!note.startsWith("Tratamento temporário · ")) return null;
  const course = parseTemporaryCourseNote(note);
  let through: string | null = null;
  let start: string | null = null;
  let totalDays: number | null = null;
  let currentDay: number | null = null;
  let usesHourInterval = false;
  let phase: CourseJourneyPhaseD4 = "review_dates";
  if (course) {
    try {
      const end = temporaryCourseEnd({ ...course, times: course.intervalHours ? [] : ["00:00"] });
      const first = dayNumber(course.start), last = dayNumber(end), todayNo = dayNumber(today);
      if (first !== null && last !== null && todayNo !== null && last >= first && course.days >= 1) {
        usesHourInterval = Boolean(course.intervalHours);
        start = course.start; through = end; totalDays = course.days;
        phase = todayNo < first ? "future" : todayNo > last ? "period_elapsed" : "within_period";
        if (phase === "within_period" && !usesHourInterval) currentDay = Math.max(1, Math.min(course.days, todayNo-first+1));
      }
    } catch { /* nota legada/corrompida exige conferência; não inferir calendário */ }
  }
  const selected = logs.filter(row => row.user_id === userId && row.person_id === personId &&
    row.medicamento_id === medicationId && row.dose_kind === "planned" && row.motivo === note);
  if (!selected.length) return null;
  let confirmed = 0, ignored = 0, earlierPending = 0, todayPending = 0, futurePending = 0;
  let conflicted = false;
  const slots = new Set<string>();
  for (const row of selected) {
    const dateNo = dayNumber(row.data);
    if (dateNo === null || !TIME.test(row.horario)) { conflicted = true; continue; }
    const slot = `${row.data}|${row.horario}`;
    if (slots.has(slot)) conflicted = true;
    slots.add(slot);
    if (row.tomado_em && row.ignorado_em) conflicted = true;
    if (start && through && (row.data < start || row.data > through)) conflicted = true;
    if (row.tomado_em) confirmed++;
    else if (row.ignorado_em) ignored++;
    else if (row.data < today) earlierPending++;
    else if (row.data > today) futurePending++;
    else todayPending++;
  }
  const warning = !course || !start || !through ? "Datas ou origem do período precisam de conferência." :
    conflicted ? "Há horários duplicados, inválidos ou desfechos conflitantes: confira os registros." : null;
  return { courseKey, phase, start, through, currentDay, totalDays, usesHourInterval, scheduled:selected.length,
    confirmed,ignored,earlierPending,todayPending,futurePending,conflicted,warning };
}

export function courseJourneyCaptionD4(course: CourseJourneyD4): string {
  if (course.phase === "review_dates") return "Período a conferir";
  if (course.phase === "future") return "Período ainda não iniciado";
  if (course.phase === "period_elapsed") return "Prazo registrado encerrado — isso não confirma a conclusão";
  if (course.usesHourInterval) return `Período por intervalo de ${course.totalDays} dia(s) — confira os horários`;
  return `Dia ${course.currentDay} de ${course.totalDays} do período informado`;
}
