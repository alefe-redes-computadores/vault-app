import {
  LocalNotifications,
  type LocalNotificationSchema,
  type PendingLocalNotificationSchema,
} from "@capacitor/local-notifications";

export const VAULT_NOTIFICATION_FINGERPRINT = "vaultReconcileFingerprint";

type OwnedNotification = PendingLocalNotificationSchema & {
  extra?: Record<string, unknown>;
};

let reconciliationTail: Promise<void> = Promise.resolve();

function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = reconciliationTail.then(work, work);
  reconciliationTail = run.then(() => undefined, () => undefined);
  return run;
}

/** Stable semantic key. Dates must be supplied as timestamps, never locale strings. */
export function vaultNotificationFingerprint(parts: Array<string | number | boolean | null | undefined>): string {
  return parts.map((part) => encodeURIComponent(String(part ?? ""))).join("|");
}

function fingerprintOf(notification: { extra?: unknown }): string {
  const extra = notification.extra as Record<string, unknown> | undefined;
  return typeof extra?.[VAULT_NOTIFICATION_FINGERPRINT] === "string"
    ? String(extra[VAULT_NOTIFICATION_FINGERPRINT])
    : "";
}

export function planVaultNotificationReconciliation(
  existing: OwnedNotification[],
  desired: LocalNotificationSchema[]
): { cancelIds: number[]; schedule: LocalNotificationSchema[]; kept: number } {
  const existingById = new Map(existing.map((notification) => [notification.id, notification]));
  const desiredById = new Map(desired.map((notification) => [notification.id, notification]));
  const cancelIds = existing
    .filter((notification) => {
      const next = desiredById.get(notification.id);
      return !next || fingerprintOf(notification) !== fingerprintOf(next);
    })
    .map((notification) => notification.id);
  const schedule = desired.filter((notification) => {
    const current = existingById.get(notification.id);
    return !current || fingerprintOf(current) !== fingerprintOf(notification);
  });
  return { cancelIds, schedule, kept: desired.length - schedule.length };
}

/**
 * Reconciles only the owned set and serializes native reads/writes across schedulers.
 * Unchanged notifications stay intact; changed IDs are cancelled before rescheduling.
 */
export function reconcileVaultNotificationSet(
  desired: LocalNotificationSchema[],
  owns: (notification: OwnedNotification) => boolean
): Promise<{ desired: number; scheduled: number; cancelled: number; kept: number }> {
  return serialized(async () => {
    const pending = await LocalNotifications.getPending();
    const existing = pending.notifications.filter((notification): notification is OwnedNotification => owns(notification as OwnedNotification));
    const plan = planVaultNotificationReconciliation(existing, desired);

    if (plan.cancelIds.length > 0) {
      await LocalNotifications.cancel({ notifications: plan.cancelIds.map((id) => ({ id })) });
    }
    if (plan.schedule.length > 0) {
      await LocalNotifications.schedule({ notifications: plan.schedule });
    }

    return {
      desired: desired.length,
      scheduled: plan.schedule.length,
      cancelled: plan.cancelIds.length,
      kept: plan.kept,
    };
  });
}
