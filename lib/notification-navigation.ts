"use client";

type NotificationNavigationTask = () => void | Promise<void>;

/**
 * VAULT_NOTIFICATION_NAVIGATION_V66
 *
 * Notificações não dependem mais de um lock biométrico global.
 *
 * O destino deve ser executado imediatamente. Se a página de destino
 * possuir uma ação realmente sensível, o próprio domínio é responsável
 * por solicitar biometria no momento dessa ação.
 *
 * O nome público foi preservado para compatibilidade com Providers e
 * reconciliadores existentes, evitando reescrever os fluxos de deep-link.
 */
export function runAfterVaultBiometricUnlock(
  task: NotificationNavigationTask
): () => void {
  let active = true;

  const invoke = () => {
    if (!active) return;

    try {
      void Promise.resolve(task()).catch((error) => {
        console.error(
          "[Notification navigation] Falha no deep-link:",
          error
        );
      });
    } catch (error) {
      console.error(
        "[Notification navigation] Falha no deep-link:",
        error
      );
    }
  };

  invoke();

  return () => {
    active = false;
  };
}
