"use client";
import { useEffect } from "react";
import { checkVaultUpdates, getVaultUpdateSnapshot, subscribeVaultUpdates } from "@/lib/updates/client";
import { notifyVaultUpdateOnce, reconcileVaultArtifactExpiryReminder } from "@/lib/updates/notifications";

/** Cheap, shared foreground checks; never starts a background service or clinical query. */
export function VaultUpdateReconciler() {
  useEffect(() => {
    const maybeNotify = () => {
      const snapshot = getVaultUpdateSnapshot();
      if (snapshot.phase !== "ready") return;
      void notifyVaultUpdateOnce(snapshot);
      void reconcileVaultArtifactExpiryReminder(snapshot);
    };
    const unsubscribe = subscribeVaultUpdates(maybeNotify);
    void checkVaultUpdates().then(maybeNotify);
    const onActive = () => { if (document.visibilityState === "visible") void checkVaultUpdates().then(maybeNotify); };
    const onOnline = () => { void checkVaultUpdates().then(maybeNotify); };
    const timer = window.setInterval(onActive, 6 * 60 * 60 * 1000);
    document.addEventListener("visibilitychange", onActive);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onActive);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return null;
}
