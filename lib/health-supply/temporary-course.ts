/** Explicit finite schedule. Dates and times come from the user's prescription. */
export type TemporaryCourse = {
  start: string;
  days: number;
  /** Horários fixos por dia. Mantido para cursos legados. */
  times?: string[];
  /** Intervalo corrido prescrito. Nunca é inferido a partir dos horários. */
  intervalHours?: number;
  /** Primeira dose local no formato YYYY-MM-DDTHH:mm. */
  firstDoseAt?: string;
  /** Quantidade prescrita em cada horário. Ausente em cursos legados. */
  quantityPerDose?: number;
};
export const TEMPORARY_COURSE_PREFIX = "Tratamento temporário · ";

const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

function intervalSlots(course: TemporaryCourse): Array<{ date: string; time: string }> {
  if (!Number.isInteger(course.intervalHours) || course.intervalHours! < 1 || course.intervalHours! > 24 ||
      !course.firstDoseAt || !LOCAL_DATE_TIME.test(course.firstDoseAt) ||
      !Number.isInteger(course.days) || course.days < 1 || course.days > 30) {
    throw new Error("Informe a primeira dose, duração de 1 a 30 dias e intervalo de 1 a 24 horas conforme a prescrição.");
  }
  const match = LOCAL_DATE_TIME.exec(course.firstDoseAt)!;
  if (match[1] !== course.start) throw new Error("A primeira dose deve ocorrer na data inicial informada.");
  const base = new Date(`${course.firstDoseAt}:00Z`);
  if (Number.isNaN(base.getTime())) throw new Error("Data e horário da primeira dose inválidos.");
  const limit = base.getTime() + course.days * 24 * 60 * 60 * 1000;
  const step = course.intervalHours! * 60 * 60 * 1000;
  const slots: Array<{ date: string; time: string }> = [];
  for (let instant = base.getTime(); instant < limit; instant += step) {
    const iso = new Date(instant).toISOString();
    slots.push({ date: iso.slice(0, 10), time: iso.slice(11, 16) });
  }
  return slots;
}

export function temporaryCourseSlots(course: TemporaryCourse): Array<{ date: string; time: string }> {
  const { start, days, times = [], quantityPerDose } = course;
  if (course.intervalHours !== undefined || course.firstDoseAt) {
    if (times.length) throw new Error("Escolha horários fixos ou intervalo entre doses, não os dois modos ao mesmo tempo.");
    const slots = intervalSlots(course);
    if (quantityPerDose !== undefined && (!Number.isFinite(quantityPerDose) || quantityPerDose <= 0 || quantityPerDose > 1000))
      throw new Error("Informe uma quantidade válida por dose, conforme a prescrição.");
    return slots;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isInteger(days) || days < 1 || days > 30 ||
      !times.length || times.length > 8 || new Set(times).size !== times.length ||
      times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error("Informe início, duração de 1 a 30 dias e horários válidos da prescrição.");
  if (quantityPerDose !== undefined && (!Number.isFinite(quantityPerDose) || quantityPerDose <= 0 || quantityPerDose > 1000))
    throw new Error("Informe uma quantidade válida por dose, conforme a prescrição.");
  const base = new Date(`${start}T12:00:00Z`);
  if (Number.isNaN(base.getTime()) || base.toISOString().slice(0, 10) !== start) throw new Error("Data de início inválida.");
  const slots: Array<{ date: string; time: string }> = [];
  for (let day = 0; day < days; day++) {
    const date = new Date(base); date.setUTCDate(date.getUTCDate() + day);
    for (const time of times) slots.push({ date: date.toISOString().slice(0, 10), time });
  }
  return slots;
}

export function temporaryCourseEnd(course: TemporaryCourse): string {
  const slots = temporaryCourseSlots(course);
  if (course.intervalHours !== undefined) return slots.at(-1)!.date;
  const end = new Date(`${course.start}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + course.days - 1);
  return end.toISOString().slice(0, 10);
}

export function temporaryCourseTotals(course: TemporaryCourse) {
  const plannedDoses = temporaryCourseSlots(course).length;
  return {
    plannedDoses,
    plannedUnits: course.quantityPerDose === undefined ? undefined : plannedDoses * course.quantityPerDose,
  };
}

export function temporaryCourseNote(course: TemporaryCourse): string {
  const base = `${TEMPORARY_COURSE_PREFIX}${course.start} · ${course.days} dia(s)`;
  return course.intervalHours && course.firstDoseAt
    ? `${base} · intervalo ${course.intervalHours}h · primeira ${course.firstDoseAt}`
    : base;
}

/** Lê notas novas e legadas sem transformar texto arbitrário em prescrição. */
export function parseTemporaryCourseNote(note: string): Pick<TemporaryCourse, "start" | "days" | "intervalHours" | "firstDoseAt"> | null {
  const match = /^Tratamento temporário · (\d{4}-\d{2}-\d{2}) · (\d+) dia\(s\)(?: · intervalo (\d+)h · primeira (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}))?$/.exec(note);
  if (!match) return null;
  const parsed = {
    start: match[1], days: Number(match[2]),
    intervalHours: match[3] ? Number(match[3]) : undefined,
    firstDoseAt: match[4] || undefined,
  };
  try {
    temporaryCourseSlots({ ...parsed, times: parsed.intervalHours ? [] : ["00:00"] });
    return parsed;
  } catch {
    return null;
  }
}
