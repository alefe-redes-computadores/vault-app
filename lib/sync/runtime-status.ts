"use client";
// VAULT_BOOT_SYNC_V50_1
import { useSyncExternalStore } from "react";
export type VaultSyncPhase = "idle" | "pulling" | "pushing" | "synced" | "error";
export interface VaultSyncRuntimeState { phase: VaultSyncPhase; error: string | null; lastSyncedAt: string | null; }
// VAULT_SYNC_UX_V56
const LAST_SYNC_KEY = "vault_last_sync";
function readLastSync(): string | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(LAST_SYNC_KEY); if (!raw) return null; const parsed = JSON.parse(raw); return typeof parsed === "string" ? parsed : null; } catch { return null; }
}
let state: VaultSyncRuntimeState = { phase: "idle", error: null, lastSyncedAt: null };
const listeners = new Set<() => void>();
export function setVaultSyncRuntime(next: Omit<VaultSyncRuntimeState, "lastSyncedAt"> & { lastSyncedAt?: string | null }) {
  let lastSyncedAt = next.lastSyncedAt ?? state.lastSyncedAt ?? readLastSync();
  if (next.phase === "synced") {
    lastSyncedAt = new Date().toISOString();
    if (typeof window !== "undefined") { try { localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(lastSyncedAt)); } catch {} }
  }
  const resolved: VaultSyncRuntimeState = { ...next, lastSyncedAt };
  if (state.phase === resolved.phase && state.error === resolved.error && state.lastSyncedAt === resolved.lastSyncedAt) return;
  state = resolved; listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }
function getSnapshot() { return state; }
const serverSnapshot: VaultSyncRuntimeState = { phase: "idle", error: null, lastSyncedAt: null };
function getServerSnapshot() { return serverSnapshot; }
export function useVaultSyncRuntime() { return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot); }
