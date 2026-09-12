import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { reminderRunsOnWeekday } from "./domain";
import type { HealthReminderRule } from "./types";

const DAYS_AHEAD = 21;
const MAX_PENDING = 60;
const CHANNEL_ID = "vault-health-reminders";

export type HealthReminderScheduleResult = {
  native: boolean;
  permission: "granted" | "denied" | "prompt" | "unavailable";
  scheduled: number;
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result % 2147483000) + 1;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function occurrences(rule: HealthReminderRule) {
  const [hour, minute] = rule.time.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return [];
  }

  const now = new Date();
  const result: Date[] = [];
  for (let offset = 0; offset <= DAYS_AHEAD; offset += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    date.setHours(hour, minute, 0, 0);
    if (date > now && reminderRunsOnWeekday(rule.frequency, rule.weekdays, date.getDay())) {
      result.push(date);
    }
  }
  return result;
}

export function notificationId(ruleId: string, date: Date) {
  return hash(`${ruleId}:${dateKey(date)}:${date.getHours()}:${date.getMinutes()}`);
}

export async function getHealthReminderPermission(): Promise<HealthReminderScheduleResult["permission"]> {
  if (!Capacitor.isNativePlatform()) return "unavailable";
  const permission = await LocalNotifications.checkPermissions();
  return permission.display === "granted"
    ? "granted"
    : permission.display === "denied"
      ? "denied"
      : "prompt";
}

export async function requestHealthReminderPermission() {
  if (!Capacitor.isNativePlatform()) return "unavailable" as const;
  const permission = await LocalNotifications.requestPermissions();
  return permission.display === "granted" ? "granted" as const : "denied" as const;
}

export async function reconcileHealthReminderNotifications(
  rules: HealthReminderRule[]
): Promise<HealthReminderScheduleResult> {
  if (!Capacitor.isNativePlatform()) {
    return { native: false, permission: "unavailable", scheduled: 0 };
  }

  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications
    .filter((notification) =>
      (notification.extra as { vaultHealthReminder?: boolean } | undefined)?.vaultHealthReminder
    )
    .map((notification) => ({ id: notification.id }));
  if (ours.length > 0) await LocalNotifications.cancel({ notifications: ours });

  const active = rules.filter((rule) => rule.status === "active");
  const permission = await getHealthReminderPermission();
  if (permission !== "granted" || active.length === 0) {
    return { native: true, permission, scheduled: 0 };
  }

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Lembretes de saúde",
    description: "Lembretes configurados por você no Vault",
    importance: 4,
    visibility: 1,
    vibration: true,
  }).catch(() => undefined);

  const notifications = active
    .flatMap((rule) => occurrences(rule).map((at) => ({ rule, at })))
    .sort((left, right) => left.at.getTime() - right.at.getTime())
    .slice(0, MAX_PENDING)
    .map(({ rule, at }) => ({
      id: notificationId(rule.id, at),
      title: rule.title,
      body: rule.body || "Hora de registrar no Vault.",
      channelId: CHANNEL_ID,
      schedule: { at, allowWhileIdle: true },
      extra: {
        vaultHealthReminder: true,
        reminderId: rule.id,
        personId: rule.person_id,
        targetRoute: rule.target_route,
        type: "health_reminder",
      },
    }));

  if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
  return { native: true, permission, scheduled: notifications.length };
}
