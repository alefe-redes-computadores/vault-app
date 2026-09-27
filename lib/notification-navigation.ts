// lib/notification-navigation.ts
"use client";

type NotificationNavigationTask = () => void | Promise<void>;

function isBiometricLocked(): boolean {
  return typeof document !== "undefined" &&
    document.body.classList.contains("biometric-locked");
}

/**
 * VAULT_NOTIFICATION_UNLOCK_GATE_V1
 *
 * O evento da notificação pode chegar enquanto o overlay biométrico ainda
 * protege o app. Não perdemos o destino e não navegamos "por baixo" do lock:
 * a ação é concluída assim que o BiometricLock anuncia o desbloqueio.
 */
export function runAfterVaultBiometricUnlock(
  task: NotificationNavigationTask
): () => void {
  const invoke = () => {
    try {
      void Promise.resolve(task()).catch((error) => {
        console.error("[Notification navigation] Falha no deep-link:", error);
      });
    } catch (error) {
      console.error("[Notification navigation] Falha no deep-link:", error);
    }
  };

  if (typeof window === "undefined" || !isBiometricLocked()) {
    invoke();
    return () => {};
  }

  let active = true;

  const cleanup = () => {
    if (!active) return;
    active = false;
    window.removeEventListener("biometric:lockchange", handleLockChange);
  };

  function handleLockChange() {
    if (!active || isBiometricLocked()) return;
    cleanup();
    invoke();
  }

  window.addEventListener("biometric:lockchange", handleLockChange);
  return cleanup;
}
