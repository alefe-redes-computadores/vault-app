import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import { LocalNotifications } from "@capacitor/local-notifications";

import { isVaultNative } from "@/lib/native-runtime";
import {
  ensureVaultNotificationChannel,
  isNotificationPreferenceEnabled,
  VAULT_NOTIFICATION_CHANNEL_ID,
} from "@/lib/notifications";

const MAX_EVENT_PENDING = 30;
const EVENT_MARKER = "vaultHealthEvent";

export type HealthEventNotificationInput = {
  id: string;
  userId: string;
  personId: string;
  kind: "consulta" | "exame" | "retirada";
  title: string;
  date: string;
  time?: string | null;
  status: string;
  targetRoute: string;
};

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result % 2147483000) + 1;
}

function parseEventDate(date: string, time?: string | null): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) return null;

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    result.getHours() !== hour ||
    result.getMinutes() !== minute
  ) {
    return null;
  }

  return result;
}

function isSchedulable(event: HealthEventNotificationInput): boolean {
  if (!event.id.trim() || !event.personId.trim() || !event.userId.trim()) return false;

  if (event.kind === "retirada") {
    return event.status === "agendada";
  }

  return event.status === "agendada" || event.status === "agendado";
}

function labelFor(kind: HealthEventNotificationInput["kind"]): string {
  if (kind === "consulta") return "Consulta";
  if (kind === "exame") return "Exame";
  return "Retirada";
}

function bodyFor(event: HealthEventNotificationInput, timing: "day" | "hour"): string {
  const label = labelFor(event.kind);
  return timing === "day"
    ? `${label} amanhã às ${event.time}. ${event.title}`
    : `${label} em cerca de 1 hora. ${event.title}`;
}

export async function reconcileHealthEventNotifications(
  events: HealthEventNotificationInput[]
): Promise<number> {
  if (!isVaultNative()) return 0;

  const pending = await LocalNotifications.getPending();
  const ours = pending.notifications
    .filter((notification) => {
      const extra = notification.extra as Record<string, unknown> | undefined;
      return extra?.[EVENT_MARKER] === true;
    })
    .map((notification) => ({ id: notification.id }));

  if (ours.length > 0) {
    await LocalNotifications.cancel({ notifications: ours });
  }

  if (!isNotificationPreferenceEnabled()) return 0;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") return 0;

  await ensureVaultNotificationChannel();

  const now = new Date();
  const notifications = events
    .filter(isSchedulable)
    .filter((event) => {
      if (event.kind === "consulta") {
        return isVaultNotificationCategoryEnabled("consultas");
      }
      if (event.kind === "exame") {
        return isVaultNotificationCategoryEnabled("exames");
      }
      return isVaultNotificationCategoryEnabled("retiradas");
    })
    .flatMap((event) => {
      const at = parseEventDate(event.date, event.time);
      if (!at || at <= now) return [];

      const candidates: Array<{ timing: "day" | "hour"; at: Date }> = [];

      const dayBefore = new Date(at.getTime() - 24 * 60 * 60 * 1000);
      if (dayBefore > now) candidates.push({ timing: "day", at: dayBefore });

      const hourBefore = new Date(at.getTime() - 60 * 60 * 1000);
      if (hourBefore > now) candidates.push({ timing: "hour", at: hourBefore });

      return candidates.map(({ timing, at: notifyAt }) => ({
        id: hash(`health-event:${event.kind}:${event.id}:${timing}`),
        title: `${labelFor(event.kind)} · ${event.time}`,
        body: bodyFor(event, timing),
        channelId: VAULT_NOTIFICATION_CHANNEL_ID,
        schedule: {
          at: notifyAt,
          allowWhileIdle: true,
        },
        extra: {
          [EVENT_MARKER]: true,
          type: "health_event",
          eventKind: event.kind,
          eventId: event.id,
          userId: event.userId,
          personId: event.personId,
          targetRoute: event.targetRoute,
        },
      }));
    })
    .sort((left, right) => {
      const leftAt = left.schedule.at.getTime();
      const rightAt = right.schedule.at.getTime();
      return leftAt - rightAt;
    })
    .slice(0, MAX_EVENT_PENDING);

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  return notifications.length;
}
