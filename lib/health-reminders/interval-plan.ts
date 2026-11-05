/** M70: expand a daytime cadence into existing per-time reminder rules.
 * No new Supabase column or unsupported platform-specific alarm type.
 */
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export function expandReminderInterval(start: string, end: string, intervalHours: number): string[] {
  if (!CLOCK.test(start) || !CLOCK.test(end)) throw Error("Use horários válidos (HH:mm).");
  if (!Number.isInteger(intervalHours) || intervalHours < 1 || intervalHours > 6) throw Error("Escolha um intervalo de 1 a 6 horas.");
  const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const from = minutes(start), to = minutes(end);
  if (to <= from) throw Error("O horário final deve ser depois do inicial, no mesmo dia.");
  const count = Math.floor((to - from) / (intervalHours * 60)) + 1;
  if (count < 2 || count > 12) throw Error("Configure entre 2 e 12 avisos por dia.");
  return Array.from({length: count}, (_, index) => {
    const value = from + index * intervalHours * 60;
    return `${String(Math.floor(value / 60)).padStart(2,"0")}:${String(value % 60).padStart(2,"0")}`;
  });
}
