import { isVaultNotificationCategoryEnabled } from "@/lib/notification-preferences";
import { LocalNotifications } from "@capacitor/local-notifications";
import { formatReminderOffset, getVaultNotificationBrainSettings } from "@/lib/notification-brain";

import { isVaultNative } from "@/lib/native-runtime";
import {
  ensureVaultNotificationChannel,
  isNotificationPreferenceEnabled,
  VAULT_NOTIFICATION_CHANNEL_ID,
} from "@/lib/notifications";
import {
  reconcileVaultNotificationSet,
  VAULT_NOTIFICATION_FINGERPRINT,
  vaultNotificationFingerprint,
} from "@/lib/notification-reconciliation";

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

function parseEventDate(
  date: string,
  time?: string | null,
  allowDateOnly = false
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  const resolvedTime = time?.trim() || (allowDateOnly ? "09:00" : "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(resolvedTime)) return null;

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = resolvedTime.split(":").map(Number);
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
  if (event.kind === "retirada" && !event.time) {
    if (offsetMinutes >= 1440) return `${label} prevista para amanhã. ${event.title}`;
    return `${label} prevista para hoje. ${event.title}`;
  }
  if (offsetMinutes === 0) return `${label} agora às ${event.time}. ${event.title}`;
  return `${label} em ${formatReminderOffset(offsetMinutes).replace(" antes", "")}. ${event.title}`;
}

export async function reconcileHealthEventNotifications(
  events: HealthEventNotificationInput[]
): Promise<number> {
  if (!isVaultNative()) return 0;

  const owns = (notification: { extra?: Record<string, unknown> }) => notification.extra?.[EVENT_MARKER] === true;
  if (!isNotificationPreferenceEnabled()) {
    await reconcileVaultNotificationSet([], owns);
    return 0;
  }

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    await reconcileVaultNotificationSet([], owns);
    return 0;
  }

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
      const at = parseEventDate(event.date, event.time, event.kind === "retirada");
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
        title: event.time
          ? `${labelFor(event.kind)} · ${event.time}`
          : labelFor(event.kind),
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
          [VAULT_NOTIFICATION_FINGERPRINT]: vaultNotificationFingerprint([
            event.kind,
            event.id,
            event.userId,
            event.personId,
            event.title,
            event.targetRoute,
            notifyAt.getTime(),
            offsetMinutes,
          ]),
        },
      }));
    })
    .sort((left, right) => {
      const leftAt = left.schedule.at.getTime();
      const rightAt = right.schedule.at.getTime();
      return leftAt - rightAt;
    })
    .slice(0, MAX_EVENT_PENDING);

  await reconcileVaultNotificationSet(notifications, owns);

  return notifications.length;
}
