"use client";
// VAULT_BOOT_SYNC_V50_1
import { useSyncExternalStore } from "react";
export type VaultSyncPhase = "idle" | "pulling" | "pushing" | "synced" | "error";
export interface VaultSyncRuntimeState { phase: VaultSyncPhase; error: string | null; }
let state: VaultSyncRuntimeState = { phase: "idle", error: null };
const listeners = new Set<() => void>();
export function setVaultSyncRuntime(next: VaultSyncRuntimeState) {
  if (state.phase === next.phase && state.error === next.error) return;
  state = next; listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
function getSnapshot() { return state; }
const serverSnapshot: VaultSyncRuntimeState = { phase: "idle", error: null };
function getServerSnapshot() { return serverSnapshot; }
export function useVaultSyncRuntime() { return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot); }
