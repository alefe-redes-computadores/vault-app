// VAULT M2 — lembretes pessoais, nao sao prova de adesao medicamentosa.
import { reminderRunsOnWeekday } from "@/lib/health-reminders/domain";
import type { HealthReminderRule } from "@/lib/health-reminders/types";

export function projectRemindersForDay(reminders: readonly HealthReminderRule[], selectedDate: string): HealthReminderRule[] {
  const [year, month, day] = selectedDate.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return reminders
    .filter(reminder => reminder.status === "active" &&
      reminderRunsOnWeekday(reminder.frequency, reminder.weekdays || [], weekday))
    .sort((a, b) => a.time.localeCompare(b.time));
}
