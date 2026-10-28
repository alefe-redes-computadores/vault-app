import type { SyncQueueItem } from "@/lib/types";

export const SYNC_MAX_RETRIES = 5;
export const SYNC_MAX_BACKOFF_MS = 60_000;

export type SyncQueueState = "ready" | "deferred" | "failed";

export function getSyncQueueState(
  item: Pick<SyncQueueItem, "failed" | "retry_count" | "next_retry_at">,
  now = Date.now()
): SyncQueueState {
  const retries = Math.max(0, Number(item.retry_count || 0));
  if (item.failed === true || retries >= SYNC_MAX_RETRIES) return "failed";

  const nextRetry = item.next_retry_at ? new Date(item.next_retry_at).getTime() : Number.NaN;
  if (Number.isFinite(nextRetry) && nextRetry > now) return "deferred";
  return "ready";
}

export function summarizeSyncQueue(items: SyncQueueItem[], now = Date.now()) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      summary[getSyncQueueState(item, now)] += 1;
      return summary;
    },
    { total: 0, ready: 0, deferred: 0, failed: 0 }
  );
}

export function resetSyncFailure(item: SyncQueueItem): Partial<SyncQueueItem> {
  return {
    failed: false,
    retry_count: 0,
    next_retry_at: null,
    error: null,
  };
}

/** Backoff persistido: sobreviver a remontagem, recarga PWA e troca de tela. */
export function getSyncRetryDelayMs(retryCount: number): number {
  const attempt = Math.max(1, Math.floor(Number(retryCount) || 1));
  return Math.min(5_000 * Math.pow(2, attempt - 1), SYNC_MAX_BACKOFF_MS);
}

export function buildSyncFailureUpdate(
  retryCount: number,
  error: string,
  now = Date.now()
): Partial<SyncQueueItem> {
  const normalized = Math.max(1, Math.floor(Number(retryCount) || 1));
  const failed = normalized >= SYNC_MAX_RETRIES;
  return {
    retry_count: normalized,
    failed,
    error,
    next_retry_at: failed
      ? null
      : new Date(now + getSyncRetryDelayMs(normalized)).toISOString(),
  };
}
