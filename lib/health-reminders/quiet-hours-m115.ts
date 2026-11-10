/** VAULT M115: optional device-only quiet hours for personalized health reminders.
 * No clinical labels, no inferred missed check-ins, no server writes.
 */
export type QuietHoursM115 = { enabled: boolean; start: string; end: string };
export const DEFAULT_QUIET_HOURS_M115: QuietHoursM115 = { enabled: false, start: "22:00", end: "08:00" };
export const QUIET_HOURS_M115_KEY = "vault:health-reminders:quiet-hours:m115:v1";
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function validateQuietHoursM115(input: unknown): QuietHoursM115 {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Preferência inválida.");
  const value = input as Record<string, unknown>;
  if (typeof value.enabled !== "boolean" || typeof value.start !== "string" || typeof value.end !== "string" ||
      !clock.test(value.start) || !clock.test(value.end) || (value.enabled && value.start === value.end)) {
    throw Error("Informe uma janela de silêncio válida; início e fim precisam ser diferentes.");
  }
  return { enabled: value.enabled, start: value.start, end: value.end };
}
export function quietAtM115(date: Date, preference: QuietHoursM115): boolean {
  if (!preference.enabled || !Number.isFinite(date.getTime())) return false;
  const start = minute(preference.start), end = minute(preference.end);
  const now = date.getHours() * 60 + date.getMinutes();
  return start < end ? now >= start && now < end : now >= start || now < end;
}
export function readQuietHoursM115(): QuietHoursM115 {
  if (typeof window === "undefined") return { ...DEFAULT_QUIET_HOURS_M115 };
  try {
    const raw = window.localStorage.getItem(QUIET_HOURS_M115_KEY);
    return raw && raw.length < 500 ? validateQuietHoursM115(JSON.parse(raw)) : { ...DEFAULT_QUIET_HOURS_M115 };
  } catch { return { ...DEFAULT_QUIET_HOURS_M115 }; }
}
export function saveQuietHoursM115(value: QuietHoursM115): QuietHoursM115 {
  if (typeof window === "undefined") throw Error("Configure no dispositivo.");
  const checked = validateQuietHoursM115(value);
  window.localStorage.setItem(QUIET_HOURS_M115_KEY, JSON.stringify(checked));
  return checked;
}
