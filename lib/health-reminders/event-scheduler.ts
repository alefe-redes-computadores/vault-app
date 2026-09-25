import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import { LocalNotifications } from "@capacitor/local-notifications";
import { formatReminderOffset, getVaultNotificationBrainSettings } from "@/lib/notification-brain";

import { isVaultNative } from "@/lib/native-runtime";
import {
  ensureVaultNotificationChannel,
  isNotificationPreferenceEnabled,
  VAULT_NOTIFICATION_CHANNEL_ID,
} from "@/lib/notifications";

const MAX_EVENT_PENDING = 60;
// VAULT_EVENT_MULTI_REMINDER_V52
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

function bodyFor(event: HealthEventNotificationInput, offsetMinutes: number): string {
  const label = labelFor(event.kind);
  if (offsetMinutes === 0) return `${label} agora às ${event.time}. ${event.title}`;
  return `${label} em ${formatReminderOffset(offsetMinutes).replace(" antes", "")}. ${event.title}`;
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

      const offsets = getVaultNotificationBrainSettings().eventOffsets[event.kind];
      const candidates = offsets
        .map((offsetMinutes) => ({
          offsetMinutes,
          at: new Date(at.getTime() - offsetMinutes * 60 * 1000),
        }))
        .filter((candidate) => candidate.at > now);

      return candidates.map(({ offsetMinutes, at: notifyAt }) => ({
        id: hash(`health-event:v52:${event.kind}:${event.id}:${offsetMinutes}`),
        title: `${labelFor(event.kind)} · ${event.time}`,
        body: bodyFor(event, offsetMinutes),
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
          offsetMinutes,
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
