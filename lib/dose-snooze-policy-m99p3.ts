/** M99 P3 — decisões puras do adiamento individual, sem registro clínico. */
export type DoseSnoozeSlotM99P3 = {
  personId: string;
  medicamentoId: string;
  data: string;
  horario: string;
};

export const DOSE_SNOOZE_MINUTES_M99P3 = 10;
export const DOSE_SNOOZE_TYPE_M99P3 = "dose_snooze_m99p3";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function doseSnoozeSlotTimeM99P3(slot: DoseSnoozeSlotM99P3): Date | null {
  if (!slot.personId.trim() || !slot.medicamentoId.trim() ||
      slot.personId.length > 160 || slot.medicamentoId.length > 160 || !TIME_RE.test(slot.horario)) return null;
  const match = DATE_RE.exec(slot.data);
  if (!match) return null;
  const y = Number(match[1]), mo = Number(match[2]), d = Number(match[3]);
  if (y < 2020 || y > 2100) return null;
  const [h, min] = slot.horario.split(":").map(Number);
  const at = new Date(y, mo - 1, d, h, min, 0, 0);
  if (at.getFullYear() !== y || at.getMonth() !== mo - 1 || at.getDate() !== d ||
      at.getHours() !== h || at.getMinutes() !== min) return null;
  return at;
}

/** Evita adiamentos disparados muito cedo ou por notificações obsoletas. */
export function canSnoozeDoseSlotM99P3(slot: DoseSnoozeSlotM99P3, now: Date): boolean {
  const at = doseSnoozeSlotTimeM99P3(slot);
  if (!at || !Number.isFinite(now.getTime())) return false;
  const lag = now.getTime() - at.getTime();
  return lag >= -5 * 60_000 && lag <= 24 * 60 * 60_000;
}

/** Mesmo slot => mesmo ID; novo adiamento substitui o antigo. */
export function doseSnoozeIdM99P3(slot: DoseSnoozeSlotM99P3): number {
  const source = `vault:m99:p3:snooze:${slot.personId}:${slot.medicamentoId}:${slot.data}:${slot.horario}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return ((hash >>> 0) % 2147483646) + 1;
}

export function summarizeSnoozedNotificationsM99P3(
  pending: Array<{extra?: unknown; schedule?: {at?: unknown}}>,
  personId: string,
  now = Date.now()
): { count: number; nextAt: number | null } {
  let count = 0;
  let nextAt: number | null = null;
  for (const item of pending) {
    const e = item.extra as Record<string, unknown> | undefined;
    if (e?.type !== DOSE_SNOOZE_TYPE_M99P3 || e.personId !== personId) continue;
    const timestamp = item.schedule?.at instanceof Date
      ? item.schedule.at.getTime()
      : typeof item.schedule?.at === "string" ? Date.parse(item.schedule.at) : NaN;
    if (!Number.isFinite(timestamp) || timestamp <= now) continue;
    count += 1;
    nextAt = nextAt === null ? timestamp : Math.min(nextAt, timestamp);
  }
  return {count, nextAt};
}
