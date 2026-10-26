"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export type SyncQueueSummary = { pending: number; failed: number; total: number };
const empty: SyncQueueSummary = { pending: 0, failed: 0, total: 0 };

/** One reactive queue scan per consumer instead of separate pending/failed scans. */
export function useSyncQueueSummary(): SyncQueueSummary {
  return useLiveQuery(async () => {
    const rows = await db.syncQueue.toArray();
    let failed = 0;
    for (const row of rows) if (row.failed === true) failed += 1;
    return { failed, pending: rows.length - failed, total: rows.length };
  }, [], empty) ?? empty;
}
