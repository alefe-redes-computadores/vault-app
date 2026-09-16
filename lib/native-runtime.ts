"use client";
import { Capacitor } from "@capacitor/core";
export type VaultRuntime = "android" | "ios" | "web";
const BUILD_RUNTIME: VaultRuntime | null =
  process.env.NEXT_PUBLIC_VAULT_NATIVE_RUNTIME === "android" ? "android" :
  process.env.NEXT_PUBLIC_VAULT_NATIVE_RUNTIME === "ios" ? "ios" : null;
export function getVaultRuntime(): VaultRuntime {
  if (typeof window === "undefined") return BUILD_RUNTIME ?? "web";
  const platform = Capacitor.getPlatform();
  if (platform === "android" || platform === "ios") return platform;
  const bridge=(window as typeof window & {Capacitor?:{getPlatform?:()=>string}}).Capacitor;
  const p=bridge?.getPlatform?.();
  if(p==="android"||p==="ios") return p;
  return BUILD_RUNTIME ?? "web";
}
export const isVaultNative=()=>getVaultRuntime()!=="web";
export const isVaultAndroid=()=>getVaultRuntime()==="android";
