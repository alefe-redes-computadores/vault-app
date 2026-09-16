"use client";
import { Capacitor } from "@capacitor/core";
export type VaultRuntime = "android" | "ios" | "web";
export function getVaultRuntime(): VaultRuntime {
  if (typeof window === "undefined") return "web";
  const platform = Capacitor.getPlatform();
  if (platform === "android" || platform === "ios") return platform;
  const bridge = (window as typeof window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const bridgePlatform = bridge?.getPlatform?.();
  if (bridgePlatform === "android" || bridgePlatform === "ios") return bridgePlatform;
  return "web";
}
export function isVaultNative(): boolean { return getVaultRuntime() !== "web"; }
export function isVaultAndroid(): boolean { return getVaultRuntime() === "android"; }
