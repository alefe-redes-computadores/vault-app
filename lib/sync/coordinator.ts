// lib/sync/coordinator.ts
// VAULT_SYNC_SINGLE_FLIGHT_V85

type PullTask = () => Promise<void>;

const activePulls = new Map<string, Promise<void>>();
const lastCompletedAt = new Map<string, number>();
const RECENT_PULL_WINDOW_MS = 30_000;

function yieldToFirstPaint(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve) => {
    const browser = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };

    if (typeof browser.requestIdleCallback === "function") {
      browser.requestIdleCallback(resolve, { timeout: 600 });
      return;
    }

    window.setTimeout(resolve, 180);
  });
}

export function runVaultPullSingleFlight(
  userId: string,
  task: PullTask,
  urgent = false
): Promise<void> {
  const current = activePulls.get(userId);
  if (current) return current;

  const completedAt = lastCompletedAt.get(userId) ?? 0;
  if (Date.now() - completedAt < RECENT_PULL_WINDOW_MS) {
    return Promise.resolve();
  }

  const execution = (async () => {
    if (!urgent) await yieldToFirstPaint();
    await task();
    lastCompletedAt.set(userId, Date.now());
  })().finally(() => {
    if (activePulls.get(userId) === execution) activePulls.delete(userId);
  });

  activePulls.set(userId, execution);
  return execution;
}
