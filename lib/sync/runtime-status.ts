"use client";
// VAULT_BOOT_SYNC_V50_1
import { useSyncExternalStore } from "react";
export type VaultSyncPhase = "idle" | "pulling" | "background" | "pushing" | "synced" | "error";
export interface VaultSyncRuntimeState { phase: VaultSyncPhase; error: string | null; lastSyncedAt: string | null; }
// VAULT_SYNC_UX_V56
// M103 P3: the legacy global key is deliberately not read: it cannot be
// attributed to an account and could falsely show another owner's sync date.
const LAST_SYNC_KEY = "vault_last_sync_owner_v103:";
let activeOwnerId: string | null = null;
function readLastSync(): string | null {
  if (typeof window === "undefined" || !activeOwnerId) return null;
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY + encodeURIComponent(activeOwnerId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "string") return null;
    const when = Date.parse(parsed);
    return Number.isFinite(when) && when <= Date.now() + 60_000 ? new Date(when).toISOString() : null;
  } catch { return null; }
}
let state: VaultSyncRuntimeState = { phase: "idle", error: null, lastSyncedAt: null };
const listeners = new Set<() => void>();
/** Only the current owner's successful sync can be shown as the latest sync. */
export function setVaultSyncRuntimeOwner(userId: string | null | undefined) {
  const nextOwner = typeof userId === "string" && !!userId.trim() && userId.length <= 256 ? userId : null;
  if (activeOwnerId === nextOwner) return;
  activeOwnerId = nextOwner;
  state = { phase: "idle", error: null, lastSyncedAt: readLastSync() };
  listeners.forEach(listener => listener());
}
export function setVaultSyncRuntime(next: Omit<VaultSyncRuntimeState, "lastSyncedAt"> & { lastSyncedAt?: string | null }, expectedOwner?: string | null) {
  if (expectedOwner !== undefined && expectedOwner !== activeOwnerId) return;
  let lastSyncedAt = next.lastSyncedAt ?? state.lastSyncedAt ?? readLastSync();
  if (next.phase === "synced") {
    lastSyncedAt = new Date().toISOString();
    if (typeof window !== "undefined" && activeOwnerId) {
      try { localStorage.setItem(LAST_SYNC_KEY + encodeURIComponent(activeOwnerId), JSON.stringify(lastSyncedAt)); } catch {}
    }
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
