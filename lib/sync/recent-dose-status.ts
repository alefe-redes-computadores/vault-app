"use client";
import { useSyncExternalStore } from "react";

/** Metadata for the current session only. No payloads, names, clinical IDs or localStorage. */
export type RecentDoseRefreshStatus = Readonly<{
  userId: string | null;
  phase: "idle" | "checking" | "complete" | "error";
  checkedAt: string | null;
  consulted: number;
  imported: number;
  unchanged: number;
  protectedLocal: number;
}>;
const empty: RecentDoseRefreshStatus = Object.freeze({
  userId: null, phase: "idle", checkedAt: null, consulted: 0, imported: 0,
  unchanged: 0, protectedLocal: 0,
});
let state: RecentDoseRefreshStatus = empty;
const listeners = new Set<() => void>();
function publish(next: RecentDoseRefreshStatus) {
  state = next;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function getSnapshot() { return state; }
function getServerSnapshot() { return empty; }
export function useRecentDoseRefreshStatus() { return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot); }
export function noteRecentDoseRefreshStart(userId: string) {
  if (!userId) return;
  publish({ ...empty, userId, phase: "checking" });
}
export function noteRecentDoseRefreshComplete(userId: string, result: {
  consulted: number; imported: number; unchanged: number; protectedLocal: number;
}) {
  if (!userId || state.userId !== userId || state.phase !== "checking") return;
  publish({ userId, phase: "complete", checkedAt: new Date().toISOString(), ...result });
}
export function noteRecentDoseRefreshError(userId: string) {
  if (!userId || state.userId !== userId || state.phase !== "checking") return;
  publish({ ...empty, userId, phase: "error", checkedAt: new Date().toISOString() });
}
