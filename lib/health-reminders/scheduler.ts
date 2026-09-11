import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { HealthReminderRule } from "./types";

const DAYS_AHEAD = 21;
function hash(value: string) { let h = 2166136261; for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h % 2147483000) + 1; }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function occurrences(rule: HealthReminderRule) {
  const [hour, minute] = rule.time.split(":").map(Number); const now = new Date(); const result: Date[] = [];
  for (let offset = 0; offset <= DAYS_AHEAD; offset++) { const d = new Date(now); d.setHours(hour, minute, 0, 0); d.setDate(now.getDate()+offset); const allowed = rule.frequency === "daily" || rule.weekdays.length === 0 || rule.weekdays.includes(d.getDay()); if (allowed && d.getTime() > now.getTime()) result.push(d); }
  return result;
}
export function notificationId(ruleId: string, date: Date) { return hash(`${ruleId}:${dateKey(date)}:${date.getHours()}:${date.getMinutes()}`); }
export async function reconcileHealthReminderNotifications(rules: HealthReminderRule[]) {
  if (!Capacitor.isNativePlatform()) return { native: false, scheduled: 0 };
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") { const asked = await LocalNotifications.requestPermissions(); if (asked.display !== "granted") return { native: true, scheduled: 0 }; }
  const pending = await LocalNotifications.getPending(); const ours = pending.notifications.filter((n) => (n.extra as { vaultHealthReminder?: boolean } | undefined)?.vaultHealthReminder).map((n) => ({ id: n.id }));
  if (ours.length) await LocalNotifications.cancel({ notifications: ours });
  const notifications = rules.filter((r) => r.status === "active").flatMap((rule) => occurrences(rule).map((at) => ({ id: notificationId(rule.id, at), title: rule.title, body: rule.body || "Hora de registrar no Vault.", schedule: { at, allowWhileIdle: true }, extra: { vaultHealthReminder: true, reminderId: rule.id, personId: rule.person_id, targetRoute: rule.target_route, type: "health_reminder" } })));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return { native: true, scheduled: notifications.length };
}
