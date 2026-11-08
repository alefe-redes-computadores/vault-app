"use client";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isVaultAndroid } from "@/lib/native-runtime";
import type { VaultUpdateSnapshot } from "./client";

const OPT_IN = "vault:update:notify-enabled:v1";
const LAST_BUILD = "vault:update:last-notified-build:v1";
export function vaultUpdateNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(OPT_IN) === "1"; } catch { return false; }
}
export async function setVaultUpdateNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (!isVaultAndroid()) return false;
  if (enabled) {
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") return false;
  }
  try { localStorage.setItem(OPT_IN, enabled ? "1" : "0"); } catch { return false; }
  return enabled;
}

/** Only on native, after explicit opt-in. This is foreground discovery, not remote push. */
export async function notifyVaultUpdateOnce(s: VaultUpdateSnapshot): Promise<void> {
  if (!isVaultAndroid() || s.phase !== "ready" || s.decision !== "available" || !s.release ||
      !vaultUpdateNotificationsEnabled()) return;
  const build = s.release.build;
  try {
    if (localStorage.getItem(LAST_BUILD) === String(build)) return;
    const permissions = await LocalNotifications.checkPermissions();
    if (permissions.display !== "granted") return;
    await LocalNotifications.schedule({notifications: [{
      id: 1867000000 + (build % 100000),
      title: "Atualização do VAULT disponível",
      body: `Build ${build} pronto. Abra Mais para atualizar com segurança.`,
      schedule: {at: new Date(Date.now() + 2500)},
      smallIcon: "ic_stat_vault",
      extra: {type:"vault_update_available"},
    }]});
    localStorage.setItem(LAST_BUILD, String(build));
  } catch {
    // Noncritical: notifications must never block clinical app startup.
  }
}
