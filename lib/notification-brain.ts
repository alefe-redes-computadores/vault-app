// VAULT_NOTIFICATION_BRAIN_V52
export type EventReminderKind = "consulta" | "exame" | "retirada";

export type VaultNotificationBrainSettings = {
  eventOffsets: Record<EventReminderKind, number[]>;
  doseOverdueOffsets: number[];
};

const KEY = "vault_notification_brain_v52";
export const VAULT_NOTIFICATION_BRAIN_EVENT = "vault:notification-brain-changed";

export const EVENT_OFFSET_OPTIONS = [
  { minutes: 2880, label: "2 dias" },
  { minutes: 1440, label: "1 dia" },
  { minutes: 360, label: "6 h" },
  { minutes: 180, label: "3 h" },
  { minutes: 60, label: "1 h" },
  { minutes: 30, label: "30 min" },
  { minutes: 0, label: "Na hora" },
] as const;

export const DOSE_OVERDUE_OFFSET_OPTIONS = [
  { minutes: 15, label: "+15 min" },
  { minutes: 30, label: "+30 min" },
  { minutes: 60, label: "+1 h" },
  { minutes: 120, label: "+2 h" },
  { minutes: 240, label: "+4 h" },
] as const;

export const DEFAULT_NOTIFICATION_BRAIN_SETTINGS: VaultNotificationBrainSettings = {
  eventOffsets: {
    consulta: [1440, 60],
    exame: [1440, 60],
    retirada: [1440, 60],
  },
  doseOverdueOffsets: [30, 60, 120],
};

function uniqueSorted(values: unknown, allowed: readonly number[], fallback: number[]): number[] {
  if (!Array.isArray(values)) return [...fallback];
  const clean = Array.from(new Set(values.filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && allowed.includes(value)
  ))).sort((a, b) => b - a);
  return clean.length ? clean : [...fallback];
}

export function getVaultNotificationBrainSettings(): VaultNotificationBrainSettings {
  if (typeof window === "undefined") return structuredClone(DEFAULT_NOTIFICATION_BRAIN_SETTINGS);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_NOTIFICATION_BRAIN_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<VaultNotificationBrainSettings>;
    const eventAllowed = EVENT_OFFSET_OPTIONS.map((item) => item.minutes);
    const doseAllowed = DOSE_OVERDUE_OFFSET_OPTIONS.map((item) => item.minutes);
    return {
      eventOffsets: {
        consulta: uniqueSorted(parsed.eventOffsets?.consulta, eventAllowed, DEFAULT_NOTIFICATION_BRAIN_SETTINGS.eventOffsets.consulta),
        exame: uniqueSorted(parsed.eventOffsets?.exame, eventAllowed, DEFAULT_NOTIFICATION_BRAIN_SETTINGS.eventOffsets.exame),
        retirada: uniqueSorted(parsed.eventOffsets?.retirada, eventAllowed, DEFAULT_NOTIFICATION_BRAIN_SETTINGS.eventOffsets.retirada),
      },
      doseOverdueOffsets: uniqueSorted(parsed.doseOverdueOffsets, doseAllowed, DEFAULT_NOTIFICATION_BRAIN_SETTINGS.doseOverdueOffsets),
    };
  } catch {
    return structuredClone(DEFAULT_NOTIFICATION_BRAIN_SETTINGS);
  }
}

export function setVaultNotificationBrainSettings(next: VaultNotificationBrainSettings) {
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(VAULT_NOTIFICATION_BRAIN_EVENT));
  window.dispatchEvent(new CustomEvent("vault:health-reminders-reconcile"));
  window.dispatchEvent(new CustomEvent("vault:notification-preferences-changed"));
  return next;
}

export function formatReminderOffset(minutes: number): string {
  if (minutes === 0) return "na hora";
  if (minutes % 1440 === 0) return `${minutes / 1440} ${minutes === 1440 ? "dia" : "dias"} antes`;
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hora" : "horas"} antes`;
  return `${minutes} min antes`;
}
