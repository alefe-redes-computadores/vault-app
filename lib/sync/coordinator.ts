// lib/sync/coordinator.ts
// VAULT_SYNC_SINGLE_FLIGHT_V85

type PullTask = () => Promise<void>;

const activePulls = new Map<string, Promise<void>>();
const urgentPulls = new Set<string>();
const queuedUrgentPulls = new Map<string, Promise<void>>();
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
  if (current) {
    if (!urgent || urgentPulls.has(userId)) return current;
    const waiting = queuedUrgentPulls.get(userId);
    if (waiting) return waiting;
    // M52: urgent/manual refresh arriving during a background pull must execute
    // AFTER the in-flight operation. Never run two pulls for the same account.
    const followUp = current.catch(() => undefined)
      .then(() => runVaultPullSingleFlight(userId, task, true))
      .finally(() => {
        if (queuedUrgentPulls.get(userId) === followUp) queuedUrgentPulls.delete(userId);
      });
    queuedUrgentPulls.set(userId, followUp);
    return followUp;
  }

  const completedAt = lastCompletedAt.get(userId) ?? 0;
  // V228: uma solicitação urgente explícita nunca some no cooldown de um pull anterior.
  if (!urgent && Date.now() - completedAt < RECENT_PULL_WINDOW_MS) {
    return Promise.resolve();
  }

  const execution = (async () => {
    if (!urgent) await yieldToFirstPaint();
    await task();
    lastCompletedAt.set(userId, Date.now());
    // Bound lightweight history across account switches, without touching data.
    if (lastCompletedAt.size > 24) {
      const oldest = lastCompletedAt.keys().next().value;
      if (oldest !== undefined) lastCompletedAt.delete(oldest);
    }
  })().finally(() => {
    if (activePulls.get(userId) === execution) activePulls.delete(userId);
    if (urgent) urgentPulls.delete(userId);
  });

  activePulls.set(userId, execution);
  if (urgent) urgentPulls.add(userId);
  return execution;
}
