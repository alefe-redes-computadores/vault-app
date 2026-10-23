/** V226 — recência descritiva das leituras utilizadas pelo Avatar. */
export type AvatarReadingFreshness = {
  recent7: number;
  recent30: number;
  historical: number;
  futureOrInvalid: number;
};

function validDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day ? value : null;
}

function noon(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12).getTime();
}

export function summarizeAvatarReadingFreshness(dates: string[], today: string): AvatarReadingFreshness {
  const counts = {recent7: 0, recent30: 0, historical: 0, futureOrInvalid: 0};
  const current = validDay(today);
  if (!current) return {...counts, futureOrInvalid: dates.length};
  for (const item of dates) {
    const date = validDay(item);
    if (!date) {counts.futureOrInvalid += 1; continue;}
    const age = Math.round((noon(current) - noon(date)) / 86_400_000);
    if (age < 0) counts.futureOrInvalid += 1;
    else if (age < 7) counts.recent7 += 1;
    else if (age < 30) counts.recent30 += 1;
    else counts.historical += 1;
  }
  return counts;
}
