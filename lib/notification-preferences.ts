export type VaultNotificationCategory =
  | "doses"
  | "consultas"
  | "exames"
  | "retiradas"
  | "renovacoes"
  | "documentos"
  | "lembretes_saude"
  | "insights";

export type VaultNotificationPreferences = Record<VaultNotificationCategory, boolean>;

const KEY = "vault_notification_categories_v36";
export const VAULT_NOTIFICATION_PREFERENCES_EVENT =
  "vault:notification-preferences-changed";

export const DEFAULT_NOTIFICATION_PREFERENCES: VaultNotificationPreferences = {
  doses: true,
  consultas: true,
  exames: true,
  retiradas: true,
  renovacoes: true,
  documentos: true,
  lembretes_saude: true,
  insights: true,
};

export function getVaultNotificationPreferences(): VaultNotificationPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(JSON.parse(raw) as Partial<VaultNotificationPreferences>),
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export function isVaultNotificationCategoryEnabled(
  category: VaultNotificationCategory
): boolean {
  return getVaultNotificationPreferences()[category] !== false;
}

function publish(next: VaultNotificationPreferences) {
  if (typeof window === "undefined") return next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(VAULT_NOTIFICATION_PREFERENCES_EVENT));
  window.dispatchEvent(new CustomEvent("vault:health-reminders-reconcile"));
  return next;
}

export function setVaultNotificationCategoryEnabled(
  category: VaultNotificationCategory,
  enabled: boolean
) {
  return publish({
    ...getVaultNotificationPreferences(),
    [category]: enabled,
  });
}

export function setAllVaultNotificationCategories(enabled: boolean) {
  return publish(
    Object.fromEntries(
      Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((key) => [key, enabled])
    ) as VaultNotificationPreferences
  );
}
