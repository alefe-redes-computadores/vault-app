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

/** M63 — pure grouping of *scheduled* withdrawal reminders.
 * Groups only exact same owner, person, event date, offset and local fire instant.
 * Different days/times/people never collapse into one notification.
 */
export type GroupableHealthEvent = {
  id: string;
  userId: string;
  personId: string;
  kind: "consulta" | "exame" | "retirada" | "compra";
  date: string;
  title: string;
};

export type GroupableHealthReminder<T extends GroupableHealthEvent = GroupableHealthEvent> = {
  event: T;
  offsetMinutes: number;
  notifyAt: Date;
};

export type HealthReminderGroup<T extends GroupableHealthEvent = GroupableHealthEvent> = {
  members: Array<GroupableHealthReminder<T>>;
  notifyAt: Date;
  offsetMinutes: number;
};

export function groupWithdrawalReminders<T extends GroupableHealthEvent>(
  rows: readonly GroupableHealthReminder<T>[],
): HealthReminderGroup<T>[] {
  const groups = new Map<string, HealthReminderGroup<T>>();
  for (const row of rows) {
    // Non-withdrawal events must preserve their individual identity.
    const key = row.event.kind === "retirada"
      ? ["retirada", row.event.userId, row.event.personId, row.event.date,
          row.offsetMinutes, row.notifyAt.getTime()].join("|")
      : ["individual", row.event.kind, row.event.userId, row.event.personId,
          row.event.id, row.offsetMinutes, row.notifyAt.getTime()].join("|");
    const previous = groups.get(key);
    if (previous) {
      // Source reconciliation can briefly include duplicate rows. No duplicate member.
      if (!previous.members.some(item => item.event.id === row.event.id)) previous.members.push(row);
    } else {
      groups.set(key, { members: [row], notifyAt: row.notifyAt, offsetMinutes: row.offsetMinutes });
    }
  }
  return Array.from(groups.values()).map(group => ({
    ...group,
    members: [...group.members].sort((a, b) => a.event.id.localeCompare(b.event.id)),
  })).sort((a, b) => a.notifyAt.getTime() - b.notifyAt.getTime());
}

export function withdrawalGroupHref(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `/saude/retiradas?data=${encodeURIComponent(date)}`
    : "/saude/retiradas";
}

export function withdrawalReminderText(count: number, offsetMinutes: number): string {
  const prefix = `${count} retiradas agendadas`;
  if (offsetMinutes === 0) return `${prefix} para hoje. Abra a lista e confira cada compromisso.`;
  if (offsetMinutes === 1440) return `${prefix} para amanhã. Confira cada compromisso.`;
  if (offsetMinutes > 0 && offsetMinutes % 1440 === 0) {
    return `${prefix} para daqui a ${offsetMinutes / 1440} dias. Confira cada compromisso.`;
  }
  if (offsetMinutes > 0 && offsetMinutes % 60 === 0) {
    return `${prefix} em ${offsetMinutes / 60} ${offsetMinutes === 60 ? "hora" : "horas"}. Confira cada compromisso.`;
  }
  return `${prefix} em ${offsetMinutes} minutos. Confira cada compromisso.`;
}

const MAX_EVENT_PENDING = 60;
// VAULT_EVENT_MULTI_REMINDER_V52
const EVENT_MARKER = "vaultHealthEvent";

export type HealthEventNotificationInput = {
  id: string;
  userId: string;
  personId: string;
  kind: "consulta" | "exame" | "retirada" | "compra";
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
  fallbackTime = ""
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  const resolvedTime = time?.trim() || fallbackTime;
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

  if (event.kind === "retirada" || event.kind === "compra") {
    return event.status === "agendada";
  }

  return event.status === "agendada" || event.status === "agendado";
}

function labelFor(kind: HealthEventNotificationInput["kind"]): string {
  if (kind === "consulta") return "Consulta";
  if (kind === "exame") return "Exame";
  if (kind === "compra") return "Compra planejada";
  return "Retirada";
}

function bodyFor(event: HealthEventNotificationInput, offsetMinutes: number): string {
  const label = labelFor(event.kind);
  if ((event.kind === "retirada" || event.kind === "compra") && !event.time) {
    if (offsetMinutes >= 0 && offsetMinutes < 1440) return `${label} prevista para hoje. ${event.title}`;
    if (offsetMinutes === 1440) return `${label} prevista para amanhã. ${event.title}`;
    return `${label} prevista em ${formatReminderOffset(offsetMinutes).replace(" antes", "")}. ${event.title}`;
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
  const settings = getVaultNotificationBrainSettings();
  const candidates = events
    .filter(isSchedulable)
    .filter((event) => {
      if (event.kind === "consulta") return isVaultNotificationCategoryEnabled("consultas");
      if (event.kind === "exame") return isVaultNotificationCategoryEnabled("exames");
      if (event.kind === "compra") return isVaultNotificationCategoryEnabled("renovacoes");
      return isVaultNotificationCategoryEnabled("retiradas");
    })
    .flatMap((event) => {
      const fallbackTime = event.kind === "retirada" ? settings.dateOnlyEventTime
        : event.kind === "compra" ? settings.plannedPurchaseTime : "";
      const at = parseEventDate(event.date, event.time, fallbackTime);
      if (!at || at <= now) return [];
      return settings.eventOffsets[event.kind]
        .map((offsetMinutes) => ({ event, offsetMinutes,
          notifyAt: new Date(at.getTime() - offsetMinutes * 60 * 1000) }))
        .filter((item) => item.notifyAt > now);
    });
  // M63: one reminder for multiple withdrawals at an exact same reminder instant.
  // Consultation, exam and purchase reminders are deliberately unchanged.
  const notifications = groupWithdrawalReminders(candidates)
    .map((group) => {
      const event = group.members[0].event;
      const eventIds = group.members.map(item => item.event.id);
      const grouped = event.kind === "retirada" && eventIds.length > 1;
      const offsetMinutes = group.offsetMinutes;
      const notifyAt = group.notifyAt;
      const targetRoute = grouped ? withdrawalGroupHref(event.date) : event.targetRoute;
      return {
        id: grouped
          ? hash(`health-event:v63:retiradas:${event.userId}:${event.personId}:${event.date}:${offsetMinutes}:${notifyAt.getTime()}`)
          : hash(`health-event:v52:${event.kind}:${event.id}:${offsetMinutes}`),
        title: grouped
          ? `${eventIds.length} retiradas · ${event.date.split("-").reverse().join("/")}`
          : event.time ? `${labelFor(event.kind)} · ${event.time}` : labelFor(event.kind),
        body: grouped ? withdrawalReminderText(eventIds.length, offsetMinutes) : bodyFor(event, offsetMinutes),
        channelId: VAULT_NOTIFICATION_CHANNEL_ID,
        schedule: { at: notifyAt, allowWhileIdle: true },
        extra: {
          [EVENT_MARKER]: true,
          type: "health_event",
          eventKind: event.kind,
          eventId: grouped ? undefined : event.id,
          eventIds: grouped ? eventIds : undefined,
          eventDate: event.date,
          userId: event.userId,
          personId: event.personId,
          targetRoute,
          offsetMinutes,
          [VAULT_NOTIFICATION_FINGERPRINT]: vaultNotificationFingerprint([
            event.kind, ...eventIds, event.userId, event.personId,
            ...group.members.map(item => item.event.title), targetRoute,
            notifyAt.getTime(), offsetMinutes,
          ]),
        },
      };
    })
    .sort((left, right) => left.schedule.at.getTime() - right.schedule.at.getTime())
    .slice(0, MAX_EVENT_PENDING);

  await reconcileVaultNotificationSet(notifications, owns);

  return notifications.length;
}
