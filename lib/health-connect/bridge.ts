"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { HealthMetric } from "@/lib/health-profile/types";
import type { ConnectRecord, ConnectStatus } from "./types";
interface NativeHealthConnect {
  status(): Promise<ConnectStatus>;
  requestPermissions(options: { types: HealthMetric[] }): Promise<ConnectStatus>;
  read(options: { types: HealthMetric[]; days: number }): Promise<{ records: ConnectRecord[]; granted: HealthMetric[] }>;
  openSettings(): Promise<void>;
}
const native = registerPlugin<NativeHealthConnect>("VaultHealthConnect");
export function connectAvailable() { return Capacitor.getPlatform() === "android" && Capacitor.isPluginAvailable("VaultHealthConnect"); }
export async function connectStatus(): Promise<ConnectStatus> {
  if (Capacitor.getPlatform() !== "android") return { availability: "web", granted: [] };
  if (!connectAvailable()) return { availability: "apk_update", granted: [] };
  return native.status();
}
export const healthConnectBridge = native;
