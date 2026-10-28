"use client";

import { liveQuery } from "dexie";
import { useSyncExternalStore } from "react";
import { db } from "@/lib/db";

export type SyncQueueSummary = { pending: number; failed: number; total: number };
const empty: SyncQueueSummary = { pending: 0, failed: 0, total: 0 };
const listeners = new Set<() => void>();
let snapshot: SyncQueueSummary = empty;
let subscription: { unsubscribe: () => void } | null = null;

function sameSummary(a: SyncQueueSummary, b: SyncQueueSummary) {
  return a.pending === b.pending && a.failed === b.failed && a.total === b.total;
}

function publish(next: SyncQueueSummary) {
  if (sameSummary(snapshot, next)) return;
  snapshot = next;
  listeners.forEach(listener => listener());
}

function startSharedQueueProjection() {
  if (subscription) return;
  subscription = liveQuery(async () => {
    const rows = await db.syncQueue.toArray();
    let failed = 0;
    for (const row of rows) if (row.failed === true) failed += 1;
    return { failed, pending: rows.length - failed, total: rows.length };
  }).subscribe({
    next: publish,
    error(error) {
      console.warn("[sync-queue-summary] Não foi possível atualizar o resumo local:", error);
    },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startSharedQueueProjection();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && subscription) {
      subscription.unsubscribe();
      subscription = null;
      snapshot = empty;
    }
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return empty;
}

/** Uma projeção Dexie compartilhada atende todos os consumidores do resumo. */
export function useSyncQueueSummary(): SyncQueueSummary {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
