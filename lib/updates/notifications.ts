"use client";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isVaultAndroid } from "@/lib/native-runtime";
import type { VaultUpdateSnapshot } from "./client";
import { getVaultTemporaryArtifactStatus, vaultArtifactReminderRelevant } from "./artifacts";

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
  if (!enabled) await clearPriorExpiryReminder();
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

// M90: a legacy Actions ZIP expiry is NOT the end of availability of a
// certified GitHub Release. Only schedule if GitHub provided real expires_at.
// A locally scheduled notification may fire with the app closed, but discovery
// still requires the app to open at least once; this is not remote push.
const LAST_EXPIRY_REMINDER = "vault:update:expiry-scheduled:v1";
const expiryNotificationId = (artifactId: number) => 1867200000 + (artifactId % 100000);

async function clearPriorExpiryReminder(): Promise<void> {
  try {
    const id = Number(localStorage.getItem(LAST_EXPIRY_REMINDER));
    if (!Number.isSafeInteger(id) || id <= 0) return;
    await LocalNotifications.cancel({notifications: [{id: expiryNotificationId(id)}]});
    localStorage.removeItem(LAST_EXPIRY_REMINDER);
  } catch { /* Notifications are noncritical. */ }
}

let expiryReminderInFlight: Promise<void> | null = null;
/** Single-flight: the observer and the Mais screen may query the same build together. */
export function reconcileVaultArtifactExpiryReminder(s: VaultUpdateSnapshot): Promise<void> {
  if (expiryReminderInFlight) return expiryReminderInFlight;
  expiryReminderInFlight = reconcileExpiryInner(s).finally(() => { expiryReminderInFlight = null; });
  return expiryReminderInFlight;
}
async function reconcileExpiryInner(s: VaultUpdateSnapshot): Promise<void> {
  if (!isVaultAndroid() || s.phase !== "ready") return;
  const artifact = s.artifact;
  const certifiedBuild = s.release?.build ?? null;
  const runId = s.run?.id ?? null;
  if (!vaultUpdateNotificationsEnabled() || !vaultArtifactReminderRelevant(s.installedBuild, certifiedBuild, runId, artifact) ||
      s.run?.number !== certifiedBuild || !artifact || getVaultTemporaryArtifactStatus(artifact) === "expired") {
    await clearPriorExpiryReminder();
    return;
  }
  try {
    const previousId = Number(localStorage.getItem(LAST_EXPIRY_REMINDER));
    if (previousId === artifact.id) return;
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted") return;
    const expires = Date.parse(artifact.expiresAt);
    const now = Date.now();
    if (!Number.isFinite(expires) || expires <= now + 10 * 60 * 1000) return;
    // Maximum one reminder, roughly a day before the verified expiry.
    const at = new Date(Math.max(now + 30 * 1000, expires - 24 * 60 * 60 * 1000));
    await clearPriorExpiryReminder();
    await LocalNotifications.schedule({notifications: [{
      id: expiryNotificationId(artifact.id),
      title: "VAULT · cópia temporária perto de expirar",
      body: "O artefato do Actions tem prazo. O APK certificado no GitHub Releases continua disponível.",
      schedule: {at},
      smallIcon: "ic_stat_vault",
      extra: {type: "vault_update_available"},
    }]});
    localStorage.setItem(LAST_EXPIRY_REMINDER, String(artifact.id));
  } catch { /* No background errors should affect the health app. */ }
}
