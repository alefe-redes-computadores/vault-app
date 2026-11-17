"use client";
import { useEffect } from "react";
/** R2: visual-only state per signed-in context, never reads or writes health data. */
export function useVisualDisclosureMemoryR2(scope: string, userId: string | undefined, personId: string | null | undefined) {
  useEffect(() => {
    if (!userId || !personId) return;
    const elements = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-vault-remember-r2]"));
    const cleanups: Array<() => void> = [];
    for (const element of elements) {
      const key = element.dataset.vaultRememberR2;
      if (!key || !/^[a-z-]{1,32}$/.test(key)) continue;
      const storageKey = `vault:ui360:r2:${scope}:${userId}:${personId}:${key}`;
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved === "1") element.open = true;
        else if (saved === "0") element.open = false;
      } catch { /* armazenamento desabilitado nao altera o aplicativo */ }
      const remember = () => {
        try { sessionStorage.setItem(storageKey, element.open ? "1" : "0"); }
        catch { /* preferencias visuais opcionais */ }
      };
      element.addEventListener("toggle", remember);
      cleanups.push(() => element.removeEventListener("toggle", remember));
    }
    return () => cleanups.forEach(cleanup => cleanup());
  }, [scope, userId, personId]);
}
