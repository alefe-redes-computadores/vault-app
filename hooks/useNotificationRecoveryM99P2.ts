"use client";
/** Revalidação ao retornar ao app, inclusive após mudança de fuso ou modo economia. */
import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { isVaultNative } from "@/lib/native-runtime";

export function useNotificationRecoveryM99P2() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let queued = false;
    let nativeListener: { remove(): Promise<void> } | null = null;
    // Eventos focus + resume podem chegar no mesmo instante: uma atualização basta.
    const refresh = () => {
      if (cancelled || queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!cancelled) setRevision(rev => rev + 1);
      });
    };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", visible);
    if (isVaultNative()) {
      try {
        void App.addListener("appStateChange", state => {
          if (state.isActive) refresh();
        }).then(handle => {
          if (cancelled) void handle.remove();
          else nativeListener = handle;
        }).catch(() => { /* Sem plugin: focus/pageshow continuam disponíveis. */ });
      } catch {
        // Não bloqueia reconciliação web quando o bridge nativo estiver ausente.
      }
    }
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", visible);
      if (nativeListener) void nativeListener.remove();
    };
  }, []);
  return revision;
}
