"use client";
import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useAuth } from "@/hooks/useAuth";
import { useActivePersonId } from "@/hooks/useActivePersonId";
import { connectAvailable } from "@/lib/health-connect/bridge";
import { syncHealthConnect } from "@/lib/health-connect/sync";
import type { PluginListenerHandle } from "@capacitor/core";
export function HealthConnectRuntime() {
  const { user } = useAuth(), { activePersonId } = useActivePersonId();
  useEffect(() => {
    if (!user?.id || !activePersonId || !connectAvailable()) return;
    const uid = user.id, pid = activePersonId;
    let disposed = false, handle: PluginListenerHandle | undefined;
    const run = () => { if (!disposed) void syncHealthConnect(uid,pid,true).catch(() => { /* connection stores recoverable status */ }); };
    run();
    void App.addListener("appStateChange",event => { if (event.isActive) run(); }).then(h => { if (disposed) void h.remove(); else handle = h; }).catch(() => {});
    return () => { disposed = true; void handle?.remove(); };
  },[user?.id,activePersonId]);
  return null;
}
