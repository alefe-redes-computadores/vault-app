/** Explicit finite schedule. Dates and times come from the user's prescription. */
export type TemporaryCourse = { start: string; days: number; times: string[] };
export const TEMPORARY_COURSE_PREFIX = "Tratamento temporário · ";

export function temporaryCourseSlots(course: TemporaryCourse): Array<{ date: string; time: string }> {
  const { start, days, times } = course;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(days) || days < 1 || days > 30 ||
      !times.length || times.length > 8 || new Set(times).size !== times.length ||
      times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error("Informe início, duração de 1 a 30 dias e horários válidos da prescrição.");
  const base = new Date(`${start}T12:00:00Z`);
  if (Number.isNaN(base.getTime()) || base.toISOString().slice(0, 10) !== start) throw new Error("Data de início inválida.");
  const slots: Array<{ date: string; time: string }> = [];
  for (let day = 0; day < days; day++) {
    const date = new Date(base); date.setUTCDate(date.getUTCDate() + day);
    for (const time of times) slots.push({ date: date.toISOString().slice(0, 10), time });
  }
  return slots;
}

export function temporaryCourseNote(course: TemporaryCourse): string {
  return `${TEMPORARY_COURSE_PREFIX}${course.start} · ${course.days} dia(s)`;
}
