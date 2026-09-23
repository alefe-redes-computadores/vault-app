"use client";

/**
 * VAULT_SECURE_SCREEN_V42
 * BiometricLock is the single global lifecycle/return-lock authority.
 * This compatibility shim intentionally does not listen to lifecycle,
 * authenticate, create overlays, or navigate.
 * Sensitive reveal/copy actions keep their page-level useBiometric gates.
 */
export function useSecureScreen() {
  return { isLocked: false };
}
